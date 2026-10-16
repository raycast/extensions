<?php
/**
 * Plugin Name: Bricks Raycast Helper
 * Description: REST endpoints for the Bricks Builder Raycast extension: content and templates, global classes (with generated CSS and usage), colors, variables, breakpoints, theme styles, dynamic data tags, element search, a site audit, a template library, form submissions, site health, maintenance tools, and creating pages and templates. Site Audit, element and dynamic data search, Form Submissions, the Template Library and site tools need a Bricks Raycast Pro license (Settings › Bricks Raycast).
 * Version: 1.6.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Matej
 * License: MIT
 */

namespace BricksRaycastHelper;

defined( 'ABSPATH' ) || exit;

const VERSION        = '1.6.0';
const REST_NAMESPACE = 'bricks-raycast/v1';
const PLUGIN_FILE    = __FILE__;

require_once __DIR__ . '/license.php';

// Bricks' meta keys, with fallbacks for when the theme isn't active.
function meta_key( string $constant, string $fallback ): string {
	return defined( $constant ) ? constant( $constant ) : $fallback;
}

function can_use(): bool {
	return current_user_can( 'edit_posts' );
}

/** Deleting site-wide data (global classes) needs an administrator. */
function can_manage(): bool {
	return current_user_can( 'manage_options' );
}

/** Post types the builder is enabled for in Bricks › Settings › General › Post types. */
function bricks_post_types(): array {
	$types = [];
	if ( class_exists( '\Bricks\Database' ) && method_exists( '\Bricks\Database', 'get_setting' ) ) {
		$types = (array) \Bricks\Database::get_setting( 'postTypes', [] );
	}
	return array_values( array_filter( $types, 'is_string' ) );
}

function builder_url( int $post_id ): string {
	if ( class_exists( '\Bricks\Helpers' ) && method_exists( '\Bricks\Helpers', 'get_builder_edit_link' ) ) {
		return (string) \Bricks\Helpers::get_builder_edit_link( $post_id );
	}
	return add_query_arg( 'bricks', 'run', get_permalink( $post_id ) );
}

function status_response(): \WP_REST_Response {
	return rest_ensure_response(
		[
			'plugin_version'    => VERSION,
			'bricks_version'    => defined( 'BRICKS_VERSION' ) ? BRICKS_VERSION : null,
			'bricks_post_types' => bricks_post_types(),
			'user'              => wp_get_current_user()->display_name,
			'license'           => license_summary(),
		]
	);
}

function content_response( \WP_REST_Request $request ): \WP_REST_Response {
	$public = get_post_types( [ 'public' => true ], 'objects' );
	unset( $public['attachment'] );

	// By default only list what Bricks can edit; scope=all lists every public post type.
	$enabled = bricks_post_types();
	if ( 'all' !== $request->get_param( 'scope' ) && $enabled ) {
		$public = array_intersect_key( $public, array_flip( array_merge( $enabled, [ 'bricks_template' ] ) ) );
	}
	if ( post_type_exists( 'bricks_template' ) ) {
		$public['bricks_template'] = get_post_type_object( 'bricks_template' );
	}

	// One query per post type, each capped, so thousands of blog posts can't push pages and
	// templates out of the list. Types that hit the cap are reported so the client can search the rest.
	$per_type = min( 5000, max( 1, (int) ( $request->get_param( 'per_type' ) ?: 1000 ) ) );
	$search   = trim( (string) $request->get_param( 'search' ) );

	$items = [];
	$types = [];
	foreach ( $public as $slug => $object ) {
		$args = [
			'post_type'              => $slug,
			'post_status'            => [ 'publish', 'future', 'draft', 'pending', 'private' ],
			'posts_per_page'         => $per_type,
			'orderby'                => 'modified',
			'order'                  => 'DESC',
			'ignore_sticky_posts'    => true,
			'update_post_term_cache' => false,
			'suppress_filters'       => false,
		];
		if ( '' !== $search ) {
			$args['s'] = $search;
		}
		$query = new \WP_Query( $args );

		foreach ( $query->posts as $post ) {
			if ( current_user_can( 'edit_post', $post->ID ) ) {
				$items[] = prepare_item( $post );
			}
		}
		$types[] = [
			'slug'      => $slug,
			'label'     => 'bricks_template' === $slug ? 'Bricks Templates' : $object->labels->name,
			'total'     => (int) $query->found_posts,
			'returned'  => count( $query->posts ),
			'truncated' => $query->found_posts > count( $query->posts ),
		];
	}

	usort(
		$items,
		function ( $a, $b ) {
			return strcmp( $b['modified_gmt'], $a['modified_gmt'] );
		}
	);

	return rest_ensure_response(
		[
			'items' => $items,
			'types' => $types,
		]
	);
}

function post_response( \WP_REST_Request $request ) {
	$post = get_post( (int) $request['id'] );
	if ( ! $post || ! current_user_can( 'edit_post', $post->ID ) ) {
		return new \WP_Error( 'not_found', 'Post not found.', [ 'status' => 404 ] );
	}
	return rest_ensure_response( prepare_item( $post ) );
}

function template_conditions( int $post_id ): array {
	$settings = get_post_meta( $post_id, meta_key( 'BRICKS_DB_TEMPLATE_SETTINGS', '_bricks_template_settings' ), true );
	return describe_conditions( is_array( $settings ) ? (array) ( $settings['templateConditions'] ?? [] ) : [] );
}

/** Last modified time as ISO 8601 UTC. New drafts have no GMT date yet, so derive it from the local one. */
function modified_gmt( \WP_Post $post ): string {
	$gmt = $post->post_modified_gmt;
	if ( ! $gmt || '0000-00-00 00:00:00' === $gmt ) {
		$gmt = get_gmt_from_date( $post->post_modified );
	}
	return str_replace( ' ', 'T', $gmt ) . 'Z';
}

function prepare_item( \WP_Post $post ): array {
	$type          = get_post_type_object( $post->post_type );
	$is_template   = 'bricks_template' === $post->post_type;
	$template_key  = meta_key( 'BRICKS_DB_TEMPLATE_TYPE', '_bricks_template_type' );

	// Headers and footers keep their elements under their own meta keys.
	$uses_bricks = false;
	foreach (
		[
			meta_key( 'BRICKS_DB_PAGE_CONTENT', '_bricks_page_content_2' ),
			meta_key( 'BRICKS_DB_PAGE_HEADER', '_bricks_page_header_2' ),
			meta_key( 'BRICKS_DB_PAGE_FOOTER', '_bricks_page_footer_2' ),
		] as $key
	) {
		if ( get_post_meta( $post->ID, $key, true ) ) {
			$uses_bricks = true;
			break;
		}
	}

	return [
		'id'            => $post->ID,
		'title'         => html_entity_decode( $post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
		'type'          => $post->post_type,
		'type_label'    => $is_template ? 'Bricks Template' : ( $type ? $type->labels->singular_name : $post->post_type ),
		'status'        => $post->post_status,
		'link'          => get_permalink( $post ),
		'builder_url'   => builder_url( $post->ID ),
		'modified_gmt'  => modified_gmt( $post ),
		'uses_bricks'   => $uses_bricks,
		'template_type' => $is_template ? ( get_post_meta( $post->ID, $template_key, true ) ?: null ) : null,
		'conditions'    => $is_template ? template_conditions( $post->ID ) : null,
	];
}

/** Bricks option value as a list, or [] when the option is missing. */
function option_list( string $constant, string $fallback ): array {
	$value = get_option( meta_key( $constant, $fallback ), [] );
	return is_array( $value ) ? array_values( $value ) : [];
}

/** id => name map for a Bricks categories option. */
function category_names( string $option ): array {
	$names = [];
	foreach ( (array) get_option( $option, [] ) as $category ) {
		if ( isset( $category['id'], $category['name'] ) ) {
			$names[ $category['id'] ] = $category['name'];
		}
	}
	return $names;
}

/** Global classes, color palettes and global CSS variables, trimmed for Raycast. Cached; see cached_response(). */
function design_response( \WP_REST_Request $request ) {
	return cached_response( 'design', $request, __NAMESPACE__ . '\design_data' );
}

function design_data(): array {
	$class_categories    = category_names( 'bricks_global_classes_categories' );
	$variable_categories = category_names( 'bricks_global_variables_categories' );

	$locked  = array_flip( array_map( 'strval', (array) get_option( 'bricks_global_classes_locked', [] ) ) );
	$usage   = class_usage();
	$utility = utility_css_map();

	$classes = [];
	foreach ( option_list( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' ) as $class ) {
		if ( empty( $class['name'] ) ) {
			continue;
		}
		$id        = (string) ( $class['id'] ?? '' );
		$settings  = isset( $class['settings'] ) && is_array( $class['settings'] ) ? $class['settings'] : [];
		$user      = ! empty( $class['user_id'] ) ? get_userdata( (int) $class['user_id'] ) : false;
		$classes[] = [
			'id'          => $id,
			'name'        => $class['name'],
			'category'    => $class_categories[ $class['category'] ?? '' ] ?? null,
			'css'         => isset( $settings['_cssCustom'] ) && is_string( $settings['_cssCustom'] ) ? $settings['_cssCustom'] : null,
			// Setting keys (e.g. _padding, _padding:tablet_portrait:hover) say what the class styles, where and when.
			'settings'    => array_values( array_filter( array_keys( $settings ), 'is_string' ) ),
			'selectors'   => array_values( array_filter( array_map( fn( $sel ) => $sel['selector'] ?? null, (array) ( $class['selectors'] ?? [] ) ) ) ),
			'modified'    => isset( $class['modified'] ) ? (int) $class['modified'] : null,
			'modified_by' => $user ? $user->display_name : null,
			'locked'      => isset( $locked[ $id ] ),
			'is_utility'  => ! $settings && isset( $utility[ $id ] ),
			'used_on'     => count( $usage['posts'][ $id ] ?? [] ),
			'components'  => $usage['components'][ $id ] ?? [],
		];
	}

	$palettes = [];
	foreach ( option_list( 'BRICKS_DB_COLOR_PALETTE', 'bricks_color_palette' ) as $palette ) {
		$colors = [];
		foreach ( (array) ( $palette['colors'] ?? [] ) as $color ) {
			$colors[] = [
				'id'              => $color['id'] ?? '',
				'name'            => $color['name'] ?? null,
				'raw'             => $color['raw'] ?? null,
				'light'           => $color['light'] ?? ( $color['hex'] ?? ( $color['rgb'] ?? ( $color['hsl'] ?? null ) ) ),
				'dark'            => $color['dark'] ?? null,
				'shade_of'        => ! empty( $color['parent'] ) ? $color['parent'] : null,
				'utility_classes' => array_values( (array) ( $color['utilityClasses'] ?? [] ) ),
			];
		}
		$palettes[] = [
			'id'     => $palette['id'] ?? '',
			'name'   => $palette['name'] ?? 'Palette',
			'colors' => $colors,
		];
	}

	$variables = [];
	foreach ( option_list( 'BRICKS_DB_GLOBAL_VARIABLES', 'bricks_global_variables' ) as $variable ) {
		if ( empty( $variable['name'] ) ) {
			continue;
		}
		$variables[] = [
			'id'       => $variable['id'] ?? '',
			'name'     => ltrim( $variable['name'], '-' ),
			'value'    => isset( $variable['value'] ) && is_scalar( $variable['value'] ) ? (string) $variable['value'] : '',
			'category' => $variable_categories[ $variable['category'] ?? '' ] ?? null,
		];
	}

	$theme_styles = [];
	foreach ( (array) get_option( meta_key( 'BRICKS_DB_THEME_STYLES', 'bricks_theme_styles' ), [] ) as $id => $style ) {
		$theme_styles[] = [
			'id'    => (string) $id,
			'label' => is_array( $style ) && ! empty( $style['label'] ) ? $style['label'] : (string) $id,
		];
	}

	return [
		'classes'      => $classes,
		'palettes'     => $palettes,
		'variables'    => $variables,
		'theme_styles' => $theme_styles,
	];
}

/** Creates a draft page/post or a Bricks template and returns it with its builder URL. */
function create_response( \WP_REST_Request $request ) {
	$type = (string) $request->get_param( 'type' );
	if ( ! post_type_exists( $type ) ) {
		return new \WP_Error( 'invalid_type', 'Unknown post type.', [ 'status' => 400 ] );
	}
	$object = get_post_type_object( $type );
	if ( ! current_user_can( $object->cap->create_posts ) ) {
		return new \WP_Error( 'forbidden', 'You can\'t create this post type.', [ 'status' => 403 ] );
	}

	$post_id = wp_insert_post(
		[
			'post_type'   => $type,
			'post_title'  => sanitize_text_field( (string) $request->get_param( 'title' ) ),
			'post_status' => 'draft',
		],
		true
	);
	if ( is_wp_error( $post_id ) ) {
		return $post_id;
	}

	$template_type = (string) $request->get_param( 'template_type' );
	if ( 'bricks_template' === $type && $template_type ) {
		update_post_meta( $post_id, meta_key( 'BRICKS_DB_TEMPLATE_TYPE', '_bricks_template_type' ), sanitize_key( $template_type ) );
	}
	bump_scan_version();

	return rest_ensure_response( prepare_item( get_post( $post_id ) ) );
}

/**
 * Where each global class is used: post IDs per class id, and component names per class id.
 * One pass over all Bricks element data (revisions and trash skipped), like Bricks' own usage scan.
 */
/**
 * Every stored Bricks element list: page content, headers and footers (revisions and trash skipped).
 * Rows have post_id, meta_key and the serialized meta_value.
 */
function element_rows(): array {
	global $wpdb;

	$keys         = array_keys( element_areas() );
	$placeholders = implode( ',', array_fill( 0, count( $keys ), '%s' ) );
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	return $wpdb->get_results(
		$wpdb->prepare(
			"SELECT pm.post_id, pm.meta_key, pm.meta_value FROM {$wpdb->postmeta} pm
			INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
			WHERE pm.meta_key IN ($placeholders)
			AND p.post_type <> 'revision' AND p.post_status NOT IN ('trash', 'auto-draft', 'inherit')",
			$keys
		)
	);
}

/** Meta key => area name for Bricks element data. */
function element_areas(): array {
	return [
		meta_key( 'BRICKS_DB_PAGE_CONTENT', '_bricks_page_content_2' ) => 'content',
		meta_key( 'BRICKS_DB_PAGE_HEADER', '_bricks_page_header_2' )   => 'header',
		meta_key( 'BRICKS_DB_PAGE_FOOTER', '_bricks_page_footer_2' )   => 'footer',
	];
}

/** Global components (Bricks 2.0+). */
function components(): array {
	$components = get_option( meta_key( 'BRICKS_DB_COMPONENTS', 'bricks_components' ), [] );
	return is_array( $components ) ? array_values( array_filter( $components, 'is_array' ) ) : [];
}

function component_name( array $component ): string {
	foreach ( [ 'label', 'name' ] as $key ) {
		if ( ! empty( $component[ $key ] ) && is_string( $component[ $key ] ) ) {
			return $component[ $key ];
		}
	}
	$root = $component['elements'][0] ?? [];
	return ! empty( $root['label'] ) ? (string) $root['label'] : (string) ( $component['id'] ?? 'Component' );
}

function class_usage(): array {
	$posts    = [];
	$elements = [];
	foreach ( element_rows() as $row ) {
		foreach ( classes_in_elements( maybe_unserialize( $row->meta_value ) ) as $class_id => $names ) {
			$posts[ $class_id ][ (int) $row->post_id ] = true;
			$elements[ $class_id ]                      = array_merge( $elements[ $class_id ] ?? [], $names );
		}
	}

	$components = [];
	foreach ( components() as $component ) {
		$name = component_name( $component );
		foreach ( classes_in_elements( $component['elements'] ?? [] ) as $class_id => $names ) {
			$components[ $class_id ][] = $name;
			$elements[ $class_id ]     = array_merge( $elements[ $class_id ] ?? [], $names );
		}
	}

	return [
		'posts'      => array_map( 'array_keys', $posts ),
		'components' => array_map( 'array_values', array_map( 'array_unique', $components ) ),
		// Element types each class is attached to (Bricks generates class CSS per element type).
		'elements'   => array_map( 'array_values', array_map( 'array_unique', $elements ) ),
	];
}

/** Global class ids referenced by a list of Bricks elements, each with the element names using it. */
function classes_in_elements( $elements ): array {
	$ids = [];
	foreach ( is_array( $elements ) ? $elements : [] as $element ) {
		foreach ( (array) ( $element['settings']['_cssGlobalClasses'] ?? [] ) as $id ) {
			$ids[ (string) $id ][] = (string) ( $element['name'] ?? 'div' );
		}
	}
	return $ids;
}

/** CSS for Bricks' generated utility classes (from palette colors and variable scales), keyed by class id. */
function utility_css_map(): array {
	if ( class_exists( '\Bricks\Assets' ) && method_exists( '\Bricks\Assets', 'generate_style_manager_utility_classes_css' ) ) {
		try {
			$map = \Bricks\Assets::generate_style_manager_utility_classes_css( 'map' );
			return is_array( $map ) ? $map : [];
		} catch ( \Throwable $e ) {
			return [];
		}
	}
	return [];
}

/**
 * The CSS Bricks generates for one global class: every breakpoint (as @media rules) and state.
 * Mirrors the loop in \Bricks\Assets::generate_global_classes() for a single class.
 */
function class_css( array $class, array $elements = [ 'div' ] ): ?string {
	// Custom CSS goes last under its own heading instead of being mixed into the generated rules.
	$custom = '';
	if ( isset( $class['settings']['_cssCustom'] ) && is_string( $class['settings']['_cssCustom'] ) ) {
		$custom = trim( str_replace( '%root%', '.' . ( $class['name'] ?? '' ), $class['settings']['_cssCustom'] ) );
		unset( $class['settings']['_cssCustom'] );
	}
	$generated = class_generated_css( $class, $elements );
	if ( null === $generated || '' === $custom ) {
		return $generated;
	}
	return trim( $generated . "\n\n/* Custom CSS */\n" . $custom );
}

function class_generated_css( array $class, array $elements ): ?string {
	$parts = [];
	foreach ( array_unique( $elements ?: [ 'div' ] ) as $element ) {
		$css = class_css_for_element( $class, $element );
		if ( null === $css ) {
			return null;
		}
		if ( '' !== $css ) {
			$parts[ $css ] = true;
		}
	}
	// Element-specific settings (icon size, nav colors…) only produce CSS for their element type.
	if ( ! $parts && $elements !== [ 'div' ] ) {
		$fallback = class_css_for_element( $class, 'div' );
		return $fallback ?? null;
	}
	return implode( "\n\n", array_keys( $parts ) );
}

function class_css_for_element( array $class, string $element ): ?string {
	if ( ! class_exists( '\Bricks\Assets' ) || ! class_exists( '\Bricks\Elements' ) || ! class_exists( '\Bricks\Breakpoints' ) ) {
		return null;
	}

	try {
		if ( empty( \Bricks\Breakpoints::$breakpoints ) ) {
			\Bricks\Breakpoints::$breakpoints = \Bricks\Breakpoints::get_breakpoints();
		}
		if ( empty( \Bricks\Database::$global_data['pseudoClasses'] ) ) {
			\Bricks\Database::$global_data['pseudoClasses'] = get_option( meta_key( 'BRICKS_DB_PSEUDO_CLASSES', 'bricks_global_pseudo_classes' ), [ ':hover', ':active', ':focus' ] );
		}

		// Bricks tracks generated CSS in static state; reset it so each class is generated fresh.
		if ( method_exists( '\Bricks\Assets', 'reset_duplication_tracking' ) ) {
			\Bricks\Assets::reset_duplication_tracking();
		}
		$type                                    = 'bricks_raycast_class';
		\Bricks\Assets::$inline_css_breakpoints = [];
		\Bricks\Assets::$inline_css[ $type ]    = '';

		$controls = \Bricks\Elements::get_element( [ 'name' => $element ], 'controls' );
		if ( ! is_array( $controls ) ) {
			return null;
		}

		$css = '';
		foreach ( (array) ( $class['selectors'] ?? [] ) as $selector ) {
			if ( empty( $selector['settings'] ) ) {
				continue;
			}
			$target = (string) ( $selector['selector'] ?? '' );
			if ( 0 === strpos( $target, ':' ) ) {
				$target = '&' . $target;
			}
			$selector_controls = $controls;
			foreach ( $selector_controls as $key => $control ) {
				foreach ( (array) ( $control['css'] ?? [] ) as $index => $rule ) {
					$selector_controls[ $key ]['css'][ $index ]['selector'] = $target;
				}
			}
			$css .= \Bricks\Assets::generate_inline_css_from_element(
				[
					'name'            => $element,
					'settings'        => $selector['settings'],
					'_cssGlobalClass' => $class['name'],
				],
				$selector_controls,
				$type
			);
		}

		$css .= \Bricks\Assets::generate_inline_css_from_element(
			[
				'name'            => $element,
				'settings'        => $class['settings'] ?? [],
				'_cssGlobalClass' => $class['name'],
			],
			$controls,
			$type
		);

		\Bricks\Assets::$inline_css[ $type ] = '';
		return trim( (string) $css );
	} catch ( \Throwable $e ) {
		return null;
	}
}

function short_post( int $post_id ): ?array {
	$post = get_post( $post_id );
	if ( ! $post || ! current_user_can( 'edit_post', $post_id ) ) {
		return null;
	}
	$type = get_post_type_object( $post->post_type );
	return [
		'id'          => $post->ID,
		'title'       => html_entity_decode( $post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
		'type_label'  => 'bricks_template' === $post->post_type ? 'Bricks Template' : ( $type ? $type->labels->singular_name : $post->post_type ),
		'status'      => $post->post_status,
		'link'        => get_permalink( $post ),
		'builder_url' => builder_url( $post->ID ),
	];
}

/** One global class in full: generated CSS and the posts that use it. */
function class_response( \WP_REST_Request $request ) {
	$id = (string) $request['id'];
	foreach ( option_list( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' ) as $class ) {
		if ( (string) ( $class['id'] ?? '' ) !== $id ) {
			continue;
		}
		$usage    = class_usage();
		$posts    = array_values( array_filter( array_map( __NAMESPACE__ . '\short_post', $usage['posts'][ $id ] ?? [] ) ) );
		$elements = $usage['elements'][ $id ] ?? [];
		$utility  = empty( $class['settings'] ) ? ( utility_css_map()[ $id ] ?? null ) : null;
		return rest_ensure_response(
			[
				'id'            => $id,
				'name'          => $class['name'] ?? '',
				'generated_css' => $utility ?? class_css( $class, $elements ),
				'is_utility'    => null !== $utility,
				'elements'      => $elements,
				'used_on'       => $posts,
				'components'    => $usage['components'][ $id ] ?? [],
			]
		);
	}
	return new \WP_Error( 'not_found', 'Class not found.', [ 'status' => 404 ] );
}

/** Human-readable list of Bricks template/theme style conditions. */
function describe_conditions( array $conditions ): array {
	$lines = [];
	foreach ( $conditions as $condition ) {
		$main = $condition['main'] ?? '';
		switch ( $main ) {
			case 'any':
				$text = 'Entire website';
				break;
			case 'frontpage':
				$text = 'Front page';
				break;
			case 'search':
				$text = 'Search results';
				break;
			case 'error':
				$text = '404 page';
				break;
			case 'postType':
				$labels = array_map(
					function ( $slug ) {
						$object = get_post_type_object( $slug );
						return $object ? $object->labels->name : $slug;
					},
					(array) ( $condition['postType'] ?? [] )
				);
				$text   = 'Post type: ' . implode( ', ', $labels );
				break;
			case 'archiveType':
				$text = 'Archive: ' . implode( ', ', (array) ( $condition['archiveType'] ?? [ 'any' ] ) );
				if ( ! empty( $condition['archivePostTypes'] ) ) {
					$text .= ' (' . implode( ', ', (array) $condition['archivePostTypes'] ) . ')';
				}
				if ( ! empty( $condition['archiveTerms'] ) ) {
					$text .= ' (' . implode( ', ', array_map( __NAMESPACE__ . '\term_label', (array) $condition['archiveTerms'] ) ) . ')';
				}
				break;
			case 'terms':
				$text = 'Terms: ' . implode( ', ', array_map( __NAMESPACE__ . '\term_label', (array) ( $condition['terms'] ?? [] ) ) );
				break;
			case 'ids':
				$titles = array_map(
					function ( $post_id ) {
						$title = get_the_title( (int) $post_id );
						return $title ? "{$title} (#{$post_id})" : "#{$post_id}";
					},
					(array) ( $condition['ids'] ?? [] )
				);
				$text   = 'Specific: ' . implode( ', ', $titles ) . ( ! empty( $condition['idsIncludeChildren'] ) ? ' + children' : '' );
				break;
			case 'hook':
				$text = 'Hook: ' . ( $condition['hookName'] ?? '?' ) . ( isset( $condition['hookPriority'] ) ? ' (priority ' . $condition['hookPriority'] . ')' : '' );
				break;
			default:
				$text = $main ? ucfirst( $main ) : 'Unknown condition';
		}
		$lines[] = ( ! empty( $condition['exclude'] ) ? 'Exclude: ' : '' ) . $text;
	}
	return $lines;
}

function term_label( $value ): string {
	$value = (string) $value;
	if ( false === strpos( $value, '::' ) ) {
		return $value;
	}
	[ $taxonomy, $term_id ] = explode( '::', $value, 2 );
	if ( 'all' === $term_id ) {
		return "all {$taxonomy}";
	}
	$term = get_term( (int) $term_id, $taxonomy );
	return $term && ! is_wp_error( $term ) ? "{$term->name} ({$taxonomy})" : $value;
}

/** Site-wide Bricks setup: breakpoints, states, theme styles. */
function site_response(): \WP_REST_Response {
	$breakpoints = [];
	$base_width  = null;
	if ( class_exists( '\Bricks\Breakpoints' ) && method_exists( '\Bricks\Breakpoints', 'get_breakpoints' ) ) {
		$list = \Bricks\Breakpoints::get_breakpoints();
		foreach ( (array) $list as $bp ) {
			if ( ! empty( $bp['base'] ) ) {
				$base_width = (int) $bp['width'];
			}
		}
		foreach ( (array) $list as $bp ) {
			$width         = (int) ( $bp['width'] ?? 0 );
			$is_base       = ! empty( $bp['base'] );
			$breakpoints[] = [
				'key'    => $bp['key'] ?? '',
				'label'  => $bp['label'] ?? ( $bp['key'] ?? '' ),
				'width'  => $width,
				'base'   => $is_base,
				'custom' => ! empty( $bp['custom'] ),
				'paused' => ! empty( $bp['paused'] ),
				'media'  => $is_base ? null : ( null !== $base_width && $width > $base_width ? "(min-width: {$width}px)" : "(max-width: {$width}px)" ),
			];
		}
	}

	$theme_styles = [];
	foreach ( (array) get_option( meta_key( 'BRICKS_DB_THEME_STYLES', 'bricks_theme_styles' ), [] ) as $id => $style ) {
		$settings       = is_array( $style ) && isset( $style['settings'] ) && is_array( $style['settings'] ) ? $style['settings'] : [];
		$theme_styles[] = [
			'id'         => (string) $id,
			'label'      => is_array( $style ) && ! empty( $style['label'] ) ? $style['label'] : (string) $id,
			'conditions' => describe_conditions( (array) ( $settings['conditions']['conditions'] ?? [] ) ),
			'groups'     => array_values( array_diff( array_keys( $settings ), [ 'conditions' ] ) ),
		];
	}

	return rest_ensure_response(
		[
			'bricks_version'    => defined( 'BRICKS_VERSION' ) ? BRICKS_VERSION : null,
			'mobile_first'      => class_exists( '\Bricks\Breakpoints' ) && property_exists( '\Bricks\Breakpoints', 'is_mobile_first' ) && ! empty( \Bricks\Breakpoints::$is_mobile_first ),
			'breakpoints'       => $breakpoints,
			'pseudo_classes'    => array_values( (array) get_option( meta_key( 'BRICKS_DB_PSEUDO_CLASSES', 'bricks_global_pseudo_classes' ), [] ) ),
			'theme_styles'      => $theme_styles,
			'bricks_post_types' => bricks_post_types(),
			'css_loading'       => class_exists( '\Bricks\Database' ) ? ( \Bricks\Database::get_setting( 'cssLoading' ) ?: 'inline' ) : null,
		]
	);
}

/** id => name for global classes. */
function class_names(): array {
	$names = [];
	foreach ( option_list( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' ) as $class ) {
		if ( isset( $class['id'], $class['name'] ) ) {
			$names[ (string) $class['id'] ] = (string) $class['name'];
		}
	}
	return $names;
}

/** Up to 120 characters of $text around the first match of $needle, on one line. */
function excerpt( string $text, string $needle ): string {
	$text = trim( (string) preg_replace( '/\s+/u', ' ', wp_strip_all_tags( $text ) ) );
	$pos  = '' === $needle ? false : mb_stripos( $text, $needle );
	if ( false === $pos || mb_strlen( $text ) <= 120 ) {
		return mb_substr( $text, 0, 120 );
	}
	$start = max( 0, $pos - 40 );
	return ( $start > 0 ? '…' : '' ) . mb_substr( $text, $start, 120 ) . ( $start + 120 < mb_strlen( $text ) ? '…' : '' );
}

/** Setting paths (e.g. _typography › color › hex) whose string value contains $needle. */
function matching_settings( $value, string $needle, string $path = '' ): array {
	$found = [];
	if ( is_string( $value ) ) {
		if ( false !== mb_stripos( $value, $needle ) ) {
			$found[] = [
				'field' => $path,
				'text'  => excerpt( $value, $needle ),
			];
		}
		return $found;
	}
	if ( ! is_array( $value ) ) {
		return $found;
	}
	foreach ( $value as $key => $child ) {
		// Classes are matched by name; signatures and ids are noise.
		if ( in_array( $key, [ '_cssGlobalClasses', 'signature', 'id' ], true ) ) {
			continue;
		}
		$found = array_merge( $found, matching_settings( $child, $needle, '' === $path ? (string) $key : $path . ' › ' . $key ) );
		if ( count( $found ) >= 3 ) {
			break;
		}
	}
	return $found;
}

/**
 * Searches every Bricks element on the site: pages, templates, headers, footers and components.
 * Matches element type, label, id, global class names and any text setting (content, CSS, colors, links…).
 */
function search_response( \WP_REST_Request $request ): \WP_REST_Response {
	$query   = trim( (string) $request->get_param( 'q' ) );
	$type    = sanitize_key( (string) $request->get_param( 'element' ) );
	$limit   = min( 500, max( 1, (int) ( $request->get_param( 'limit' ) ?: 200 ) ) );
	$classes = class_names();

	$sources = [];
	foreach ( element_rows() as $row ) {
		$sources[] = [
			'post_id'   => (int) $row->post_id,
			'component' => null,
			'area'      => element_areas()[ $row->meta_key ] ?? 'content',
			'elements'  => maybe_unserialize( $row->meta_value ),
		];
	}
	foreach ( components() as $component ) {
		$sources[] = [
			'post_id'   => null,
			'component' => component_name( $component ),
			'area'      => 'component',
			'elements'  => $component['elements'] ?? [],
		];
	}

	$types   = [];
	$results = [];
	$total   = 0;
	$posts   = [];
	foreach ( $sources as $source ) {
		if ( $source['post_id'] ) {
			if ( ! array_key_exists( $source['post_id'], $posts ) ) {
				$posts[ $source['post_id'] ] = short_post( $source['post_id'] );
			}
			if ( ! $posts[ $source['post_id'] ] ) {
				continue; // Not editable by this user.
			}
		}
		foreach ( is_array( $source['elements'] ) ? $source['elements'] : [] as $element ) {
			if ( ! is_array( $element ) || empty( $element['name'] ) ) {
				continue;
			}
			$name           = (string) $element['name'];
			$types[ $name ] = ( $types[ $name ] ?? 0 ) + 1;
			if ( '' !== $type && $name !== $type ) {
				continue;
			}
			if ( '' === $query && '' === $type ) {
				continue; // Nothing asked yet: only the element type counts are returned.
			}

			$label        = isset( $element['label'] ) && is_string( $element['label'] ) ? $element['label'] : '';
			$element_id   = (string) ( $element['id'] ?? '' );
			$class_list   = array_values( array_filter( array_map( fn( $id ) => $classes[ (string) $id ] ?? null, (array) ( $element['settings']['_cssGlobalClasses'] ?? [] ) ) ) );
			$matches      = [];
			if ( '' !== $query ) {
				$needle = ltrim( $query, '.#' );
				if ( false !== mb_stripos( $name, $query ) ) {
					$matches[] = [ 'field' => 'element', 'text' => $name ];
				}
				if ( '' !== $label && false !== mb_stripos( $label, $query ) ) {
					$matches[] = [ 'field' => 'label', 'text' => $label ];
				}
				if ( '' !== $element_id && ( $element_id === $needle || 'brxe-' . $element_id === $needle ) ) {
					$matches[] = [ 'field' => 'id', 'text' => '#brxe-' . $element_id ];
				}
				foreach ( $class_list as $class_name ) {
					if ( '' !== $needle && false !== mb_stripos( $class_name, $needle ) ) {
						$matches[] = [ 'field' => 'class', 'text' => '.' . $class_name ];
					}
				}
				$matches = array_merge( $matches, matching_settings( $element['settings'] ?? [], $query ) );
				if ( ! $matches ) {
					continue;
				}
			}

			++$total;
			if ( count( $results ) >= $limit ) {
				continue;
			}
			$results[] = [
				'post'      => $source['post_id'] ? $posts[ $source['post_id'] ] : null,
				'component' => $source['component'],
				'area'      => $source['area'],
				'element'   => [
					'id'      => $element_id,
					'name'    => $name,
					'label'   => '' !== $label ? $label : null,
					'classes' => $class_list,
				],
				'matches'   => array_slice( $matches, 0, 3 ),
			];
		}
	}

	arsort( $types );
	return rest_ensure_response(
		[
			'results'       => $results,
			'total'         => $total,
			'element_types' => array_map(
				fn( $name, $count ) => [ 'name' => $name, 'count' => $count ],
				array_keys( $types ),
				array_values( $types )
			),
		]
	);
}

/**
 * Class ids that must not be trashed even when no element uses them: classes referenced by
 * component class properties and by legacy global elements.
 */
function protected_class_ids(): array {
	$ids = [];
	foreach ( components() as $component ) {
		foreach ( (array) ( $component['properties'] ?? [] ) as $property ) {
			if ( ! is_array( $property ) || 'class' !== ( $property['type'] ?? '' ) ) {
				continue;
			}
			foreach ( (array) ( $property['options'] ?? [] ) as $option ) {
				foreach ( (array) ( $option['value'] ?? [] ) as $id ) {
					$ids[ (string) $id ] = true;
				}
			}
			foreach ( (array) ( $property['default'] ?? [] ) as $id ) {
				$ids[ (string) $id ] = true;
			}
		}
	}
	foreach ( (array) get_option( meta_key( 'BRICKS_DB_GLOBAL_ELEMENTS', 'bricks_global_elements' ), [] ) as $element ) {
		foreach ( (array) ( $element['settings']['_cssGlobalClasses'] ?? [] ) as $id ) {
			$ids[ (string) $id ] = true;
		}
	}
	return $ids;
}

/** Global classes no element, component or global element uses. Locked and generated utility classes are left out. */
function unused_classes(): array {
	$usage     = class_usage();
	$protected = protected_class_ids();
	$locked    = array_flip( array_map( 'strval', (array) get_option( meta_key( 'BRICKS_DB_GLOBAL_CLASSES_LOCKED', 'bricks_global_classes_locked' ), [] ) ) );
	$utility   = utility_css_map();
	$names     = category_names( 'bricks_global_classes_categories' );

	$unused = [];
	foreach ( option_list( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' ) as $class ) {
		$id = (string) ( $class['id'] ?? '' );
		if ( '' === $id || empty( $class['name'] ) ) {
			continue;
		}
		$is_utility = empty( $class['settings'] ) && isset( $utility[ $id ] );
		if ( isset( $usage['posts'][ $id ] ) || isset( $usage['components'][ $id ] ) || isset( $protected[ $id ] ) || isset( $locked[ $id ] ) || $is_utility ) {
			continue;
		}
		$unused[ $id ] = [
			'id'         => $id,
			'name'       => (string) $class['name'],
			'category'   => $names[ $class['category'] ?? '' ] ?? null,
			'has_styles' => ! empty( $class['settings'] ) || ! empty( $class['selectors'] ),
		];
	}
	return $unused;
}

function class_trash_option(): string {
	return meta_key( 'BRICKS_DB_GLOBAL_CLASSES_TRASH', 'bricks_global_classes_trash' );
}

/** Saves global classes the way the builder does, so open builders notice the change. */
function save_global_classes( array $classes ): void {
	$classes = array_values( array_filter( $classes ) );
	if ( class_exists( '\Bricks\Helpers' ) && method_exists( '\Bricks\Helpers', 'save_global_classes_in_db' ) ) {
		\Bricks\Helpers::save_global_classes_in_db( $classes );
		return;
	}
	update_option( meta_key( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' ), $classes );
}

function code_signature_status( array $settings ): string {
	if ( empty( $settings['signature'] ) ) {
		return 'missing';
	}
	if ( class_exists( '\Bricks\Helpers' ) && method_exists( '\Bricks\Helpers', 'verify_code_signature' ) ) {
		return \Bricks\Helpers::verify_code_signature( $settings['signature'], $settings['code'] ?? '' ) ? 'valid' : 'invalid';
	}
	return 'unknown';
}

/** Default for when a served file counts as large; the extension can pass large_kb. */
const LARGE_IMAGE_BYTES = 300 * 1024;

/** Bytes above which a served image counts as large, for this request. */
function large_image_bytes( ?int $kb = null ): int {
	static $bytes = LARGE_IMAGE_BYTES;
	if ( null !== $kb && $kb > 0 ) {
		$bytes = $kb * 1024;
	}
	return $bytes;
}
/** Served width above this is more than any screen needs. */
const OVERSIZED_IMAGE_WIDTH = 2560;
/** Attachment meta set when an image is intentionally decorative (empty alt). */
const DECORATIVE_META = '_bricks_raycast_decorative';

/** Alt text that's really a file name or camera default ("IMG_1234.jpg", "DSC0042", "hero-image-2"). */
function alt_looks_like_filename( string $alt, string $filename ): bool {
	$alt = trim( $alt );
	if ( '' === $alt ) {
		return false;
	}
	if ( preg_match( '/\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?)$/i', $alt ) || preg_match( '/^(img|dsc|dscn|pxl|image|photo|screenshot|screen shot)[\s_-]*\d+/i', $alt ) ) {
		return true;
	}
	$base = strtolower( (string) preg_replace( '/\.[a-z0-9]+$/i', '', $filename ) );
	return '' !== $base && strtolower( $alt ) === $base;
}

/** Width, height and bytes of the file Bricks serves for an attachment at an image size. */
function served_image( int $attachment_id, string $size ): ?array {
	$meta = wp_get_attachment_metadata( $attachment_id );
	if ( ! is_array( $meta ) ) {
		return null;
	}
	$file = get_attached_file( $attachment_id );
	if ( 'full' !== $size && isset( $meta['sizes'][ $size ] ) ) {
		$variant = $meta['sizes'][ $size ];
		$bytes   = $variant['filesize'] ?? null;
		if ( null === $bytes && $file && ! empty( $variant['file'] ) ) {
			$path  = path_join( dirname( $file ), $variant['file'] );
			$bytes = file_exists( $path ) ? filesize( $path ) : null;
		}
		return [
			'size'     => $size,
			'width'    => (int) ( $variant['width'] ?? 0 ),
			'height'   => (int) ( $variant['height'] ?? 0 ),
			'filesize' => null !== $bytes ? (int) $bytes : null,
		];
	}
	$bytes = $meta['filesize'] ?? ( $file && file_exists( $file ) ? filesize( $file ) : null );
	return [
		'size'     => 'full',
		'width'    => (int) ( $meta['width'] ?? 0 ),
		'height'   => (int) ( $meta['height'] ?? 0 ),
		'filesize' => null !== $bytes ? (int) $bytes : null,
	];
}

/** For an image on this site referenced only by URL: whether its file exists (null when it's elsewhere). */
function local_url_exists( string $url ): ?bool {
	$uploads = wp_get_upload_dir();
	if ( '' === $url || 0 !== strpos( set_url_scheme( $url, 'https' ), set_url_scheme( $uploads['baseurl'], 'https' ) ) ) {
		return null;
	}
	$relative = substr( set_url_scheme( $url, 'https' ), strlen( set_url_scheme( $uploads['baseurl'], 'https' ) ) );
	return file_exists( $uploads['basedir'] . strtok( $relative, '?' ) );
}

/** Every <img> tag in a value (recursively), with its src, whether it has an alt attribute, and its wp-image-ID. */
function inline_images( $value ): array {
	if ( is_array( $value ) ) {
		$found = [];
		foreach ( $value as $key => $child ) {
			if ( 'signature' !== $key ) {
				$found = array_merge( $found, inline_images( $child ) );
			}
		}
		return $found;
	}
	if ( ! is_string( $value ) || false === stripos( $value, '<img' ) ) {
		return [];
	}
	preg_match_all( '/<img\b[^>]*>/i', $value, $tags );
	$found = [];
	foreach ( $tags[0] as $tag ) {
		preg_match( '/\ssrc\s*=\s*["\']([^"\']+)/i', $tag, $src );
		preg_match( '/\swp-image-(\d+)/i', $tag, $id );
		preg_match( '/\salt\s*=\s*["\']([^"\']*)/i', $tag, $alt );
		$found[] = [
			'url'     => $src[1] ?? '',
			'id'      => isset( $id[1] ) ? (int) $id[1] : 0,
			'has_alt' => (bool) preg_match( '/\salt\s*=/i', $tag ),
			'alt'     => $alt[1] ?? '',
		];
	}
	return $found;
}

/**
 * Every image Bricks uses: Image and Image Gallery elements, backgrounds (all breakpoints and states),
 * <img> tags in text, rich text, HTML and code, and dynamic data images (featured images resolved,
 * others listed as dynamic). In pages, templates and global components.
 * Plus media library images without alt text that Bricks doesn't use.
 */
function image_audit(): array {
	static $cache = null;
	if ( null !== $cache ) {
		return $cache;
	}

	$default_size = defined( 'BRICKS_DEFAULT_IMAGE_SIZE' ) ? BRICKS_DEFAULT_IMAGE_SIZE : 'large';
	$posts        = [];
	$images       = [];
	$dynamic      = [];

	$sources = [];
	foreach ( element_rows() as $row ) {
		$post_id = (int) $row->post_id;
		if ( ! array_key_exists( $post_id, $posts ) ) {
			$posts[ $post_id ] = short_post( $post_id );
		}
		if ( $posts[ $post_id ] ) {
			$sources[] = [ $posts[ $post_id ], null, maybe_unserialize( $row->meta_value ) ];
		}
	}
	foreach ( components() as $component ) {
		$sources[] = [ null, component_name( $component ), $component['elements'] ?? [] ];
	}

	$add = function ( array $ref, array $usage ) use ( &$images ) {
		$id  = (int) ( $ref['id'] ?? 0 );
		$url = (string) ( $ref['url'] ?? '' );
		if ( ! $id && '' === $url ) {
			return;
		}
		$key = $id ? "id-{$id}" : 'url-' . $url;
		if ( ! isset( $images[ $key ] ) ) {
			$images[ $key ] = [
				'id'     => $id,
				'url'    => $url,
				'usages' => [],
			];
		}
		$images[ $key ]['usages'][] = $usage;
	};

	foreach ( $sources as [ $post, $component, $elements ] ) {
		foreach ( is_array( $elements ) ? $elements : [] as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			$settings = isset( $element['settings'] ) && is_array( $element['settings'] ) ? $element['settings'] : [];
			$name     = (string) ( $element['name'] ?? '' );
			$base     = [
				'post'       => $post,
				'component'  => $component,
				'element_id' => (string) ( $element['id'] ?? '' ),
				'label'      => ! empty( $element['label'] ) && is_string( $element['label'] ) ? $element['label'] : null,
			];
			$dynamic_usage = function ( string $tag, string $kind, string $size, bool $own_alt ) use ( $base, $post, $add, &$dynamic ) {
				// {featured_image} on a page is that page's featured image; elsewhere it depends on the query.
				if ( $post && 'Bricks Template' !== $post['type_label'] && preg_match( '/^\{featured_image\b/', $tag ) ) {
					$thumbnail = (int) get_post_thumbnail_id( $post['id'] );
					if ( $thumbnail ) {
						$add( [ 'id' => $thumbnail ], $base + [ 'kind' => $kind, 'size' => $size, 'own_alt' => $own_alt, 'tag' => $tag ] );
						return;
					}
				}
				$dynamic[] = $base + [ 'kind' => $kind, 'tag' => $tag, 'own_alt' => $own_alt ];
			};

			if ( 'image' === $name && isset( $settings['image'] ) && is_array( $settings['image'] ) ) {
				$image   = $settings['image'];
				$own_alt = ! empty( $settings['altText'] );
				$size    = ! empty( $image['size'] ) ? (string) $image['size'] : $default_size;
				if ( ! empty( $image['useDynamicData'] ) ) {
					$dynamic_usage( (string) $image['useDynamicData'], 'image', $size, $own_alt );
				} else {
					$add( $image, $base + [ 'kind' => 'image', 'size' => $size, 'own_alt' => $own_alt ] );
				}
			}

			if ( 'image-gallery' === $name && isset( $settings['items'] ) && is_array( $settings['items'] ) ) {
				$size = ! empty( $settings['items']['size'] ) ? (string) $settings['items']['size'] : $default_size;
				if ( ! empty( $settings['items']['useDynamicData'] ) ) {
					$dynamic_usage( (string) $settings['items']['useDynamicData'], 'gallery', $size, false );
				}
				foreach ( (array) ( $settings['items']['images'] ?? [] ) as $image ) {
					if ( is_array( $image ) ) {
						$add( $image, $base + [ 'kind' => 'gallery', 'size' => $size, 'own_alt' => false ] );
					}
				}
			}

			// _background, _background:mobile_portrait, _background:hover… CSS backgrounds have no alt text.
			foreach ( $settings as $key => $value ) {
				if ( ! is_string( $key ) || 0 !== strpos( $key, '_background' ) || ! is_array( $value ) || empty( $value['image'] ) || ! is_array( $value['image'] ) ) {
					continue;
				}
				$image = $value['image'];
				$size  = ! empty( $image['size'] ) ? (string) $image['size'] : 'full';
				if ( ! empty( $image['useDynamicData'] ) ) {
					$dynamic_usage( (string) $image['useDynamicData'], 'background', $size, true );
				} else {
					$add( $image, $base + [ 'kind' => 'background', 'size' => $size, 'own_alt' => true, 'breakpoint' => '_background' === $key ? null : substr( $key, strlen( '_background:' ) ) ] );
				}
			}

			foreach ( inline_images( $settings ) as $inline ) {
				$add(
					[
						'id'  => $inline['id'],
						'url' => $inline['url'],
					],
					$base + [ 'kind' => 'inline', 'size' => null, 'own_alt' => $inline['has_alt'], 'alt' => $inline['alt'] ]
				);
			}
		}
	}

	$items   = [];
	$used    = [];
	$summary = [
		'used'           => 0,
		'missing_alt'    => 0,
		'filename_alt'   => 0,
		'large'          => 0,
		'oversized'      => 0,
		'old_format'     => 0,
		'broken'         => 0,
		'dynamic'        => count( $dynamic ),
		'unused_library' => 0,
	];

	foreach ( $images as $image ) {
		$id     = $image['id'];
		$exists = $id && 'attachment' === get_post_type( $id );
		$url    = $exists ? (string) wp_get_attachment_url( $id ) : $image['url'];
		if ( $exists ) {
			$used[ $id ] = true;
		}
		$item = image_item( $exists ? $id : 0, $url, $image['usages'] );
		// Image, gallery and background settings load the file by its media library id, so an id that
		// doesn't exist here (deleted, or copied from another site) renders nothing. <img> tags use src.
		$by_id = array_filter( $image['usages'], fn( $usage ) => 'inline' !== $usage['kind'] );
		if ( ( ! $exists && $id && $by_id ) || ( ! $exists && false === local_url_exists( $url ) ) ) {
			$item['issues'][]    = 'broken';
			$item['missing_id'] = $id ?: null;
		}
		$item['issues'] = array_values( array_unique( $item['issues'] ) );
		foreach ( $item['issues'] as $issue ) {
			++$summary[ $issue ];
		}
		++$summary['used'];
		$items[] = $item;
	}

	// Media library images without alt text that Bricks doesn't use (newest 300).
	$unused_query = new \WP_Query(
		[
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'post_mime_type' => 'image',
			'posts_per_page' => 300,
			'post__not_in'   => array_keys( $used ),
			'fields'         => 'ids',
			'meta_query'     => [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'relation' => 'AND',
				[
					'relation' => 'OR',
					[
						'key'     => '_wp_attachment_image_alt',
						'compare' => 'NOT EXISTS',
					],
					[
						'key'   => '_wp_attachment_image_alt',
						'value' => '',
					],
				],
				[
					'key'     => DECORATIVE_META,
					'compare' => 'NOT EXISTS',
				],
			],
		]
	);
	$unused = [];
	foreach ( $unused_query->posts as $id ) {
		$unused[] = array_merge( image_item( (int) $id, (string) wp_get_attachment_url( $id ), [] ), [ 'unused' => true ] );
	}
	$summary['unused_library'] = (int) $unused_query->found_posts;

	$cache = [
		'images'         => $items,
		'dynamic'        => $dynamic,
		'unused_library' => $unused,
		'summary'        => $summary,
	];
	return $cache;
}

/** One image with its media library details, what Bricks serves, and its issues. */
function image_item( int $id, string $url, array $usages ): array {
	$meta       = $id ? wp_get_attachment_metadata( $id ) : null;
	$filename   = $url ? wp_basename( (string) wp_parse_url( $url, PHP_URL_PATH ) ) : '';
	$alt        = $id ? trim( (string) get_post_meta( $id, '_wp_attachment_image_alt', true ) ) : '';
	$decorative = $id && get_post_meta( $id, DECORATIVE_META, true );
	$mime       = $id ? (string) get_post_mime_type( $id ) : (string) ( wp_check_filetype( $filename )['type'] ?? '' );

	// The largest file Bricks serves for this image across its uses.
	$served = null;
	foreach ( $usages as $usage ) {
		if ( ! $id || empty( $usage['size'] ) ) {
			continue;
		}
		$candidate = served_image( $id, (string) $usage['size'] );
		if ( $candidate && ( ! $served || (int) $candidate['filesize'] > (int) $served['filesize'] ) ) {
			$served = $candidate;
		}
	}

	$issues  = [];
	$alt_fix = null;
	foreach ( $usages as $usage ) {
		if ( 'background' === $usage['kind'] || $usage['own_alt'] ) {
			continue;
		}
		if ( 'inline' === $usage['kind'] ) {
			$issues[] = 'missing_alt';
			$alt_fix  = $alt_fix ?? 'bricks'; // An <img> tag's alt is in the HTML, not the media library.
		} elseif ( '' === $alt && ! $decorative ) {
			$issues[] = 'missing_alt';
			$alt_fix  = $id ? 'library' : 'bricks';
		}
	}
	if ( ! $usages && '' === $alt && ! $decorative ) {
		$issues[] = 'missing_alt';
		$alt_fix  = 'library';
	}
	if ( alt_looks_like_filename( $alt, $filename ) ) {
		$issues[] = 'filename_alt';
	}
	if ( $served && $served['filesize'] > large_image_bytes() ) {
		$issues[] = 'large';
	}
	if ( $served && $served['width'] > OVERSIZED_IMAGE_WIDTH ) {
		$issues[] = 'oversized';
	}
	if ( in_array( $mime, [ 'image/bmp', 'image/tiff' ], true ) || ( $served && in_array( $mime, [ 'image/jpeg', 'image/png', 'image/gif' ], true ) && $served['filesize'] > 100 * 1024 ) ) {
		$issues[] = 'old_format';
	}

	$title = $id ? html_entity_decode( get_the_title( $id ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) : '';
	return [
		'key'        => $id ? "id-{$id}" : 'url-' . $url,
		'id'         => $id ?: null,
		'url'        => $url,
		'preview'    => $id ? ( (string) wp_get_attachment_image_url( $id, 'medium' ) ?: $url ) : $url,
		'filename'   => $filename,
		'title'      => '' !== $title ? $title : null,
		'caption'    => $id ? ( wp_get_attachment_caption( $id ) ?: null ) : null,
		'mime'       => $mime ?: null,
		'width'      => is_array( $meta ) ? (int) ( $meta['width'] ?? 0 ) : null,
		'height'     => is_array( $meta ) ? (int) ( $meta['height'] ?? 0 ) : null,
		'filesize'   => is_array( $meta ) && isset( $meta['filesize'] ) ? (int) $meta['filesize'] : null,
		'served'     => $served,
		'alt'        => '' !== $alt ? $alt : null,
		'decorative' => (bool) $decorative,
		'can_edit'   => $id ? current_user_can( 'edit_post', $id ) : false,
		'issues'     => array_values( array_unique( $issues ) ),
		'alt_fix'    => $alt_fix,
		'usages'     => array_slice(
			array_map(
				fn( $usage ) => array_intersect_key( $usage, array_flip( [ 'post', 'component', 'element_id', 'label', 'kind', 'size', 'own_alt', 'breakpoint', 'tag' ] ) ),
				$usages
			),
			0,
			50
		),
		'usage_count' => count( $usages ),
		'unused'     => false,
		'missing_id' => null,
	];
}

function image_audit_response( \WP_REST_Request $request ) {
	return cached_response(
		'audit_images',
		$request,
		function () use ( $request ) {
			large_image_bytes( (int) $request->get_param( 'large_kb' ) );
			$audit = image_audit();
			return [
				'images'               => array_merge( $audit['images'], $audit['unused_library'] ),
				'dynamic'              => $audit['dynamic'],
				'unused_library_total' => $audit['summary']['unused_library'],
				'thresholds'           => [
					'large_bytes'     => large_image_bytes(),
					'oversized_width' => OVERSIZED_IMAGE_WIDTH,
				],
			];
		},
		[ 'large_kb' ]
	);
}

/**
 * Site audit: unused global classes, templates that need conditions but have none, Code elements
 * (and whether they run PHP), a summary of the image audit, and the pages with the most elements.
 * Cached; see cached_response().
 */
function audit_response( \WP_REST_Request $request ) {
	return cached_response( 'audit', $request, fn() => audit_data( $request ), [ 'large_kb' ] );
}

function audit_data( \WP_REST_Request $request ): array {
	large_image_bytes( (int) $request->get_param( 'large_kb' ) );
	$posts  = [];
	$post   = function ( int $id ) use ( &$posts ) {
		if ( ! array_key_exists( $id, $posts ) ) {
			$posts[ $id ] = short_post( $id );
		}
		return $posts[ $id ];
	};
	$counts = [];
	$code   = [];

	foreach ( element_rows() as $row ) {
		$post_id = (int) $row->post_id;
		$info    = $post( $post_id );
		if ( ! $info ) {
			continue;
		}
		$elements           = maybe_unserialize( $row->meta_value );
		$elements           = is_array( $elements ) ? $elements : [];
		$counts[ $post_id ] = ( $counts[ $post_id ] ?? 0 ) + count( $elements );

		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			$settings = isset( $element['settings'] ) && is_array( $element['settings'] ) ? $element['settings'] : [];
			$name     = (string) ( $element['name'] ?? '' );

			if ( 'code' === $name ) {
				$executes = ! empty( $settings['executeCode'] ) && ! empty( $settings['code'] );
				$code[]   = [
					'post'      => $info,
					'element'   => [
						'id'    => (string) ( $element['id'] ?? '' ),
						'label' => ! empty( $element['label'] ) ? (string) $element['label'] : null,
					],
					'executes'  => $executes,
					'signature' => $executes ? code_signature_status( $settings ) : null,
					'languages' => array_values( array_filter( [ ! empty( $settings['code'] ) ? ( $executes ? 'php' : 'html' ) : null, ! empty( $settings['cssCode'] ) ? 'css' : null, ! empty( $settings['javascriptCode'] ) ? 'js' : null ] ) ),
				];
			}
		}
	}

	arsort( $counts );
	$heavy = [];
	foreach ( array_slice( $counts, 0, 25, true ) as $post_id => $count ) {
		$heavy[] = [
			'post'     => $post( $post_id ),
			'elements' => $count,
		];
	}

	$needs_conditions = [ 'header', 'footer', 'content', 'archive', 'search', 'error' ];
	$templates        = [];
	$query            = new \WP_Query(
		[
			'post_type'      => 'bricks_template',
			'post_status'    => [ 'publish', 'draft', 'pending', 'private', 'future' ],
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'no_found_rows'  => true,
		]
	);
	foreach ( $query->posts as $template_id ) {
		$type = (string) get_post_meta( $template_id, meta_key( 'BRICKS_DB_TEMPLATE_TYPE', '_bricks_template_type' ), true );
		if ( ! in_array( $type, $needs_conditions, true ) || template_conditions( (int) $template_id ) ) {
			continue;
		}
		$info = $post( (int) $template_id );
		if ( $info ) {
			$templates[] = $info + [ 'template_type' => $type ];
		}
	}

	$trash = [];
	foreach ( (array) get_option( class_trash_option(), [] ) as $class ) {
		if ( is_array( $class ) && ! empty( $class['id'] ) ) {
			$trash[] = [
				'id'         => (string) $class['id'],
				'name'       => (string) ( $class['name'] ?? $class['id'] ),
				'deleted_at' => isset( $class['deletedAt'] ) ? (int) $class['deletedAt'] : null,
			];
		}
	}

	return [
		'unused_classes'               => array_values( unused_classes() ),
		'class_trash'                  => $trash,
		'templates_without_conditions' => $templates,
		'code_elements'                => $code,
		'code_execution_enabled'       => class_exists( '\Bricks\Helpers' ) && method_exists( '\Bricks\Helpers', 'code_execution_enabled' ) ? (bool) \Bricks\Helpers::code_execution_enabled() : null,
		'images'                       => image_audit()['summary'],
		'heavy_pages'                  => $heavy,
		'can_manage'                   => can_manage(),
	];
}

/**
 * Moves unused global classes to Bricks' class trash (restorable in the builder's Style Manager
 * and with /audit/restore-classes). Classes that are in use by now are skipped.
 */
function trash_classes_response( \WP_REST_Request $request ): \WP_REST_Response {
	$ids     = array_map( 'strval', (array) $request->get_param( 'ids' ) );
	$unused  = unused_classes();
	$classes = option_list( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' );
	$trash   = (array) get_option( class_trash_option(), [] );
	$now     = (int) round( microtime( true ) * 1000 );

	$trashed = [];
	$keep    = [];
	foreach ( $classes as $class ) {
		$id = (string) ( $class['id'] ?? '' );
		if ( in_array( $id, $ids, true ) && isset( $unused[ $id ] ) ) {
			$trash[]   = array_merge( $class, [ 'deletedAt' => $now ] );
			$trashed[] = [
				'id'   => $id,
				'name' => (string) $class['name'],
			];
			continue;
		}
		$keep[] = $class;
	}

	if ( $trashed ) {
		update_option( class_trash_option(), array_values( $trash ) );
		save_global_classes( $keep );
		bump_scan_version();
	}

	return rest_ensure_response(
		[
			'trashed' => $trashed,
			'skipped' => array_values( array_diff( $ids, array_column( $trashed, 'id' ) ) ),
		]
	);
}

/** Moves classes back from the trash. A name that's taken in the meantime gets "-restored", like Bricks does. */
function restore_classes_response( \WP_REST_Request $request ): \WP_REST_Response {
	$ids     = array_map( 'strval', (array) $request->get_param( 'ids' ) );
	$classes = option_list( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' );
	$names   = array_flip( array_map( fn( $class ) => (string) ( $class['name'] ?? '' ), $classes ) );
	$active  = array_flip( array_map( fn( $class ) => (string) ( $class['id'] ?? '' ), $classes ) );

	$restored = [];
	$trash    = [];
	foreach ( (array) get_option( class_trash_option(), [] ) as $class ) {
		$id = (string) ( $class['id'] ?? '' );
		if ( ! in_array( $id, $ids, true ) || isset( $active[ $id ] ) ) {
			$trash[] = $class;
			continue;
		}
		unset( $class['deletedAt'] );
		if ( isset( $names[ $class['name'] ?? '' ] ) ) {
			$class['name'] .= '-restored';
		}
		$classes[]  = $class;
		$restored[] = [
			'id'   => $id,
			'name' => (string) $class['name'],
		];
	}

	if ( $restored ) {
		save_global_classes( $classes );
		if ( $trash ) {
			update_option( class_trash_option(), array_values( $trash ) );
		} else {
			delete_option( class_trash_option() );
		}
		bump_scan_version();
	}

	return rest_ensure_response( [ 'restored' => $restored ] );
}

/** Sets an image's alt text in the media library, or marks it decorative. */
function attachment_alt_response( \WP_REST_Request $request ) {
	$id = (int) $request['id'];
	if ( 'attachment' !== get_post_type( $id ) || ! current_user_can( 'edit_post', $id ) ) {
		return new \WP_Error( 'forbidden', 'You can\'t edit this image.', [ 'status' => 403 ] );
	}
	// Decorative images keep an empty alt on purpose (screen readers skip them).
	$decorative = (bool) $request->get_param( 'decorative' );
	$alt        = $decorative ? '' : sanitize_text_field( (string) $request->get_param( 'alt' ) );
	update_post_meta( $id, '_wp_attachment_image_alt', $alt );
	if ( $decorative ) {
		update_post_meta( $id, DECORATIVE_META, 1 );
	} else {
		delete_post_meta( $id, DECORATIVE_META );
	}
	bump_scan_version();
	return rest_ensure_response(
		[
			'id'         => $id,
			'alt'        => $alt,
			'decorative' => $decorative,
		]
	);
}

/** Elements of a Bricks template: content, or the header/footer area for headers and footers. */
function template_elements( int $post_id ): array {
	foreach ( array_keys( element_areas() ) as $key ) {
		$elements = get_post_meta( $post_id, $key, true );
		if ( is_array( $elements ) && $elements ) {
			return array_values( $elements );
		}
	}
	return [];
}

/** The element tree as indented lines (depth, element type, label), for a preview. */
function element_outline( array $elements, int $max = 80 ): array {
	$children = [];
	$ids      = [];
	foreach ( $elements as $element ) {
		if ( is_array( $element ) && isset( $element['id'] ) ) {
			$ids[ (string) $element['id'] ] = true;
		}
	}
	foreach ( $elements as $element ) {
		if ( ! is_array( $element ) || ! isset( $element['id'] ) ) {
			continue;
		}
		$parent                = (string) ( $element['parent'] ?? '0' );
		$children[ isset( $ids[ $parent ] ) ? $parent : '' ][] = $element;
	}

	$lines = [];
	$walk  = function ( string $parent, int $depth ) use ( &$walk, &$lines, $children, $max ) {
		foreach ( $children[ $parent ] ?? [] as $element ) {
			if ( count( $lines ) >= $max ) {
				return;
			}
			$lines[] = [
				'depth'     => $depth,
				'name'      => (string) ( $element['name'] ?? 'div' ),
				'label'     => ! empty( $element['label'] ) && is_string( $element['label'] ) ? $element['label'] : null,
				'component' => ! empty( $element['cid'] ),
			];
			$walk( (string) $element['id'], $depth + 1 );
		}
	};
	$walk( '', 0 );
	return $lines;
}

/** Templates and global components to browse and paste into the builder. */
function library_response(): \WP_REST_Response {
	$templates = [];
	$query     = new \WP_Query(
		[
			'post_type'      => 'bricks_template',
			'post_status'    => [ 'publish', 'draft', 'pending', 'private', 'future' ],
			'posts_per_page' => -1,
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'no_found_rows'  => true,
		]
	);
	foreach ( $query->posts as $post ) {
		if ( ! current_user_can( 'edit_post', $post->ID ) ) {
			continue;
		}
		$elements    = template_elements( $post->ID );
		$templates[] = [
			'id'            => $post->ID,
			'title'         => html_entity_decode( $post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
			'template_type' => (string) get_post_meta( $post->ID, meta_key( 'BRICKS_DB_TEMPLATE_TYPE', '_bricks_template_type' ), true ) ?: null,
			'status'        => $post->post_status,
			'modified_gmt'  => modified_gmt( $post ),
			'builder_url'   => builder_url( $post->ID ),
			'link'          => get_permalink( $post ),
			'elements'      => count( $elements ),
			'outline'       => element_outline( $elements ),
		];
	}

	$components = [];
	foreach ( components() as $component ) {
		$elements     = array_values( (array) ( $component['elements'] ?? [] ) );
		$components[] = [
			'id'          => (string) ( $component['id'] ?? '' ),
			'name'        => component_name( $component ),
			'category'    => ! empty( $component['category'] ) && is_string( $component['category'] ) ? $component['category'] : null,
			'description' => ! empty( $component['desc'] ) && is_string( $component['desc'] ) ? $component['desc'] : null,
			'properties'  => count( (array) ( $component['properties'] ?? [] ) ),
			'elements'    => count( $elements ),
			'outline'     => element_outline( $elements ),
		];
	}

	return rest_ensure_response(
		[
			'templates'  => $templates,
			'components' => $components,
		]
	);
}

/**
 * What the builder puts on the clipboard when you copy elements (⌘C), so pasting (⌘V) in any
 * Bricks site brings the elements along with their global classes, global elements and components.
 */
function clipboard_for( array $content ): array {
	$all_components = [];
	foreach ( components() as $component ) {
		$all_components[ (string) ( $component['id'] ?? '' ) ] = $component;
	}

	// Components used by the elements, and the components nested in those.
	$components = [];
	$queue      = $content;
	while ( $queue ) {
		$element = array_shift( $queue );
		$cid     = is_array( $element ) ? (string) ( $element['cid'] ?? '' ) : '';
		if ( '' !== $cid && isset( $all_components[ $cid ] ) && ! isset( $components[ $cid ] ) ) {
			$components[ $cid ] = $all_components[ $cid ];
			$queue              = array_merge( $queue, (array) ( $all_components[ $cid ]['elements'] ?? [] ) );
		}
	}

	$class_ids  = classes_in_elements( $content );
	$global_ids = [];
	foreach ( $content as $element ) {
		if ( ! empty( $element['global'] ) ) {
			$global_ids[ (string) $element['global'] ] = true;
		}
	}
	foreach ( $components as $component ) {
		$class_ids += classes_in_elements( $component['elements'] ?? [] );
		foreach ( (array) ( $component['properties'] ?? [] ) as $property ) {
			if ( 'class' !== ( $property['type'] ?? '' ) ) {
				continue;
			}
			foreach ( array_merge( (array) ( $property['default'] ?? [] ), ...array_map( fn( $o ) => (array) ( $o['value'] ?? [] ), (array) ( $property['options'] ?? [] ) ) ) as $id ) {
				$class_ids[ (string) $id ] = true;
			}
		}
	}

	$clipboard = [
		'content'   => array_values( $content ),
		'source'    => 'bricksCopiedElements',
		'sourceUrl' => site_url(),
		'version'   => defined( 'BRICKS_VERSION' ) ? BRICKS_VERSION : null,
	];

	$classes = array_values( array_filter( option_list( 'BRICKS_DB_GLOBAL_CLASSES', 'bricks_global_classes' ), fn( $class ) => isset( $class_ids[ (string) ( $class['id'] ?? '' ) ] ) ) );
	if ( $classes ) {
		$clipboard['globalClasses'] = $classes;
	}
	if ( $global_ids ) {
		$clipboard['globalElements'] = array_values( array_filter( (array) get_option( meta_key( 'BRICKS_DB_GLOBAL_ELEMENTS', 'bricks_global_elements' ), [] ), fn( $element ) => isset( $global_ids[ (string) ( $element['global'] ?? ( $element['id'] ?? '' ) ) ] ) ) );
	}
	if ( $components ) {
		$clipboard['components'] = array_values( $components );
	}
	return $clipboard;
}

function library_template_response( \WP_REST_Request $request ) {
	$post = get_post( (int) $request['id'] );
	if ( ! $post || 'bricks_template' !== $post->post_type || ! current_user_can( 'edit_post', $post->ID ) ) {
		return new \WP_Error( 'not_found', 'Template not found.', [ 'status' => 404 ] );
	}
	return rest_ensure_response( clipboard_for( template_elements( $post->ID ) ) );
}

/** A component instance, the way the builder inserts one, with the component definition attached. */
function library_component_response( \WP_REST_Request $request ) {
	foreach ( components() as $component ) {
		if ( (string) ( $component['id'] ?? '' ) !== (string) $request['id'] ) {
			continue;
		}
		$root = $component['elements'][0] ?? [];
		return rest_ensure_response(
			clipboard_for(
				[
					[
						'id'       => strtolower( wp_generate_password( 6, false ) ),
						'name'     => (string) ( $root['name'] ?? 'div' ),
						'parent'   => 0,
						'children' => [],
						'settings' => [],
						'cid'      => (string) $component['id'],
					],
				]
			)
		);
	}
	return new \WP_Error( 'not_found', 'Component not found.', [ 'status' => 404 ] );
}

/** Bricks' form submissions table (filled by the "Save submission" form action), or null when it doesn't exist. */
function submissions_table(): ?string {
	global $wpdb;
	$table = $wpdb->prefix . 'bricks_form_submissions';
	return $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table ? $table : null;
}

/** A Form element's settings (fields, submission form name), as Bricks' own submissions screen reads them. */
function form_settings( int $post_id, string $form_id ): array {
	static $cache = [];
	$key = "{$post_id}-{$form_id}";
	if ( ! isset( $cache[ $key ] ) ) {
		$settings = [];
		if ( class_exists( '\Bricks\Integrations\Form\Submission_Database' ) && method_exists( '\Bricks\Integrations\Form\Submission_Database', 'get_form_settings' ) ) {
			try {
				$settings = (array) \Bricks\Integrations\Form\Submission_Database::get_form_settings( $post_id, $form_id );
			} catch ( \Throwable $e ) {
				$settings = [];
			}
		}
		$cache[ $key ] = $settings;
	}
	return $cache[ $key ];
}

function form_name( int $post_id, string $form_id ): string {
	$settings = form_settings( $post_id, $form_id );
	if ( ! empty( $settings['submissionFormName'] ) && is_string( $settings['submissionFormName'] ) ) {
		return $settings['submissionFormName'];
	}
	$title = $post_id ? get_the_title( $post_id ) : '';
	return $title ? html_entity_decode( $title, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) . " form ({$form_id})" : "Form {$form_id}";
}

/** One stored submission with field labels from the form's settings. */
function prepare_submission( object $row ): array {
	$post_id  = (int) $row->post_id;
	$form_id  = (string) $row->form_id;
	$labels   = [];
	foreach ( (array) ( form_settings( $post_id, $form_id )['fields'] ?? [] ) as $field ) {
		if ( isset( $field['id'] ) ) {
			$labels[ (string) $field['id'] ] = ! empty( $field['label'] ) ? (string) $field['label'] : ( ! empty( $field['placeholder'] ) ? (string) $field['placeholder'] : null );
		}
	}

	$fields = [];
	$email  = null;
	foreach ( (array) json_decode( (string) $row->form_data, true ) as $field_id => $field ) {
		$type  = (string) ( $field['type'] ?? 'text' );
		$value = $field['value'] ?? '';
		if ( 'file' === $type && is_array( $value ) ) {
			$value = implode( ', ', array_map( fn( $file ) => is_array( $file ) ? (string) ( $file['url'] ?? ( $file['name'] ?? '' ) ) : (string) $file, $value ) );
		} elseif ( is_array( $value ) ) {
			$value = implode( ', ', array_map( 'strval', $value ) );
		}
		$value = wp_strip_all_tags( (string) $value );
		if ( 'email' === $type && null === $email && is_email( $value ) ) {
			$email = $value;
		}
		$fields[] = [
			'id'    => (string) $field_id,
			'label' => $labels[ (string) $field_id ] ?? (string) $field_id,
			'type'  => $type,
			'value' => $value,
		];
	}

	$user = ! empty( $row->user_id ) ? get_userdata( (int) $row->user_id ) : false;
	return [
		'id'         => (int) $row->id,
		'form_id'    => $form_id,
		'form_name'  => form_name( $post_id, $form_id ),
		'post'       => $post_id ? short_post( $post_id ) : null,
		'created_at' => str_replace( ' ', 'T', (string) $row->created_at ) . 'Z',
		'fields'     => $fields,
		'email'      => $email,
		'browser'    => $row->browser ?: null,
		'os'         => $row->os ?? null ?: null,
		'ip'         => $row->ip ?: null,
		'referrer'   => $row->referrer ?? null ?: null,
		'user'       => $user ? $user->display_name : null,
	];
}

/** Forms with stored submissions: name, page, count and latest submission. */
function forms_response(): \WP_REST_Response {
	global $wpdb;
	$table = submissions_table();
	if ( ! $table ) {
		return rest_ensure_response(
			[
				'table_exists' => false,
				'forms'        => [],
				'total'        => 0,
				'max_id'       => 0,
			]
		);
	}
	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	$rows  = $wpdb->get_results( "SELECT form_id, MAX(post_id) AS post_id, COUNT(*) AS count, MAX(id) AS latest_id, MAX(created_at) AS latest_at FROM {$table} GROUP BY form_id ORDER BY latest_id DESC" );
	$forms = [];
	$total = 0;
	foreach ( $rows as $row ) {
		$total  += (int) $row->count;
		$forms[] = [
			'form_id'   => (string) $row->form_id,
			'name'      => form_name( (int) $row->post_id, (string) $row->form_id ),
			'post'      => (int) $row->post_id ? short_post( (int) $row->post_id ) : null,
			'count'     => (int) $row->count,
			'latest_id' => (int) $row->latest_id,
			'latest_at' => str_replace( ' ', 'T', (string) $row->latest_at ) . 'Z',
		];
	}
	return rest_ensure_response(
		[
			'table_exists' => true,
			'forms'        => $forms,
			'total'        => $total,
			'max_id'       => $forms ? max( array_column( $forms, 'latest_id' ) ) : 0,
		]
	);
}

/** Submissions, newest first: all forms or one, optionally only those newer than after_id. */
function submissions_response( \WP_REST_Request $request ): \WP_REST_Response {
	global $wpdb;
	$table = submissions_table();
	if ( ! $table ) {
		return rest_ensure_response(
			[
				'submissions' => [],
				'total'       => 0,
				'max_id'      => 0,
			]
		);
	}
	$where = [ '1=1' ];
	$args  = [];
	$form  = sanitize_text_field( (string) $request->get_param( 'form_id' ) );
	if ( '' !== $form ) {
		$where[] = 'form_id = %s';
		$args[]  = $form;
	}
	$after = (int) $request->get_param( 'after_id' );
	if ( $after > 0 ) {
		$where[] = 'id > %d';
		$args[]  = $after;
	}
	$per_page = min( 200, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 50 ) ) );
	$page     = max( 1, (int) ( $request->get_param( 'page' ) ?: 1 ) );
	$sql      = implode( ' AND ', $where );

	// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders
	$total = (int) $wpdb->get_var( $args ? $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE {$sql}", $args ) : "SELECT COUNT(*) FROM {$table} WHERE {$sql}" );
	$rows  = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE {$sql} ORDER BY id DESC LIMIT %d OFFSET %d", array_merge( $args, [ $per_page, ( $page - 1 ) * $per_page ] ) ) );
	$max   = (int) $wpdb->get_var( "SELECT MAX(id) FROM {$table}" );
	// phpcs:enable

	return rest_ensure_response(
		[
			'submissions' => array_map( __NAMESPACE__ . '\prepare_submission', $rows ),
			'total'       => $total,
			'max_id'      => $max,
		]
	);
}

/** Deletes submissions by id. */
function delete_submissions_response( \WP_REST_Request $request ): \WP_REST_Response {
	global $wpdb;
	$table   = submissions_table();
	$deleted = 0;
	foreach ( array_map( 'intval', (array) $request->get_param( 'ids' ) ) as $id ) {
		if ( $table && $id > 0 ) {
			$deleted += (int) $wpdb->delete( $table, [ 'id' => $id ], [ '%d' ] );
		}
	}
	bump_scan_version();
	return rest_ensure_response( [ 'deleted' => $deleted ] );
}

/** Bricks maintenance mode: '' (off), 'maintenance' or 'comingSoon'. */
function maintenance_mode(): string {
	$settings = get_option( meta_key( 'BRICKS_DB_GLOBAL_SETTINGS', 'bricks_global_settings' ), [] );
	return is_array( $settings ) && ! empty( $settings['maintenanceMode'] ) ? (string) $settings['maintenanceMode'] : '';
}

/** Available updates from WordPress' own update checks (not refreshed here), for users who can update. */
function available_updates(): ?array {
	if ( ! current_user_can( 'update_plugins' ) && ! current_user_can( 'update_core' ) ) {
		return null;
	}
	if ( ! function_exists( 'get_plugins' ) ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
	}

	$core      = get_site_transient( 'update_core' );
	$core_next = null;
	foreach ( (array) ( $core->updates ?? [] ) as $offer ) {
		if ( 'upgrade' === ( $offer->response ?? '' ) ) {
			$core_next = (string) $offer->current;
			break;
		}
	}

	$plugins     = [];
	$all_plugins = get_plugins();
	$transient   = get_site_transient( 'update_plugins' );
	foreach ( (array) ( $transient->response ?? [] ) as $file => $offer ) {
		if ( isset( $all_plugins[ $file ]['Version'] ) && version_compare( $all_plugins[ $file ]['Version'], (string) ( $offer->new_version ?? '' ), '>=' ) ) {
			continue; // Updated since the last check.
		}
		$plugins[] = [
			'name'    => $all_plugins[ $file ]['Name'] ?? (string) $file,
			'current' => $all_plugins[ $file ]['Version'] ?? null,
			'new'     => (string) ( $offer->new_version ?? '' ),
		];
	}

	$themes    = [];
	$transient = get_site_transient( 'update_themes' );
	foreach ( (array) ( $transient->response ?? [] ) as $stylesheet => $offer ) {
		$theme = wp_get_theme( $stylesheet );
		$next  = (string) ( is_array( $offer ) ? ( $offer['new_version'] ?? '' ) : ( $offer->new_version ?? '' ) );
		if ( $theme->exists() && version_compare( (string) $theme->get( 'Version' ), $next, '>=' ) ) {
			continue;
		}
		$themes[] = [
			'name'    => $theme->exists() ? $theme->get( 'Name' ) : (string) $stylesheet,
			'slug'    => (string) $stylesheet,
			'current' => $theme->exists() ? $theme->get( 'Version' ) : null,
			'new'     => $next,
		];
	}

	return [
		'core'       => $core_next,
		'plugins'    => $plugins,
		'themes'     => $themes,
		'checked_at' => isset( $core->last_checked ) ? gmdate( 'c', (int) $core->last_checked ) : null,
	];
}

/** Versions, settings and available updates, for the multi-site overview. */
function health_response(): \WP_REST_Response {
	global $wpdb;
	$theme = wp_get_theme();
	return rest_ensure_response(
		[
			'site_name'              => html_entity_decode( get_bloginfo( 'name' ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ),
			'home_url'               => home_url(),
			'wp_version'             => get_bloginfo( 'version' ),
			'php_version'            => PHP_VERSION,
			'db_version'             => $wpdb->db_server_info(),
			'bricks_version'         => defined( 'BRICKS_VERSION' ) ? BRICKS_VERSION : null,
			'theme'                  => $theme->get( 'Name' ) . ( $theme->parent() ? ' (child of ' . $theme->parent()->get( 'Name' ) . ')' : '' ),
			'plugin_version'         => VERSION,
			'css_loading'            => class_exists( '\Bricks\Database' ) ? ( \Bricks\Database::get_setting( 'cssLoading' ) ?: 'inline' ) : null,
			'maintenance_mode'       => maintenance_mode(),
			'code_execution_enabled' => class_exists( '\Bricks\Helpers' ) && method_exists( '\Bricks\Helpers', 'code_execution_enabled' ) ? (bool) \Bricks\Helpers::code_execution_enabled() : null,
			'debug'                  => defined( 'WP_DEBUG' ) && WP_DEBUG,
			'environment'            => wp_get_environment_type(),
			'multisite'              => is_multisite(),
			'search_engines_blocked' => '0' === (string) get_option( 'blog_public' ),
			'updates'                => available_updates(),
			'can_manage'             => can_manage(),
			'license'                => license_summary(),
		]
	);
}

/** Turns Bricks maintenance mode on ('maintenance' or 'comingSoon') or off (''). */
function maintenance_response( \WP_REST_Request $request ) {
	$mode = (string) $request->get_param( 'mode' );
	if ( ! in_array( $mode, [ '', 'maintenance', 'comingSoon' ], true ) ) {
		return new \WP_Error( 'invalid_mode', 'Mode must be maintenance, comingSoon or empty.', [ 'status' => 400 ] );
	}
	$option   = meta_key( 'BRICKS_DB_GLOBAL_SETTINGS', 'bricks_global_settings' );
	$settings = get_option( $option, [] );
	$settings = is_array( $settings ) ? $settings : [];
	if ( '' === $mode ) {
		unset( $settings['maintenanceMode'] );
	} else {
		$settings['maintenanceMode'] = $mode;
	}
	update_option( $option, $settings );
	bump_scan_version();
	return rest_ensure_response( [ 'mode' => maintenance_mode() ] );
}

/** Bricks' CSS file classes aren't loaded on REST requests; load them the way Bricks' own abilities do. */
function load_bricks_css_classes(): bool {
	if ( ! defined( 'BRICKS_PATH' ) ) {
		return false;
	}
	foreach (
		[
			'\Bricks\Assets_Color_Palettes'    => 'includes/assets/color-palettes.php',
			'\Bricks\Assets_Global_Custom_Css' => 'includes/assets/global-custom-css.php',
			'\Bricks\Assets_Global_Elements'   => 'includes/assets/global-elements.php',
			'\Bricks\Assets_Theme_Styles'      => 'includes/assets/theme-styles.php',
			'\Bricks\Assets_Global_Variables'  => 'includes/assets/global-variables.php',
			'\Bricks\Assets_Files'             => 'includes/assets/files.php',
		] as $class => $path
	) {
		if ( ! class_exists( $class, false ) && file_exists( BRICKS_PATH . $path ) ) {
			require_once BRICKS_PATH . $path;
		}
	}
	return class_exists( '\Bricks\Assets_Files' ) && method_exists( '\Bricks\Assets_Files', 'regenerate_css_files' );
}

/** Regenerates Bricks' CSS files (used when CSS loading is set to external files). */
function regenerate_css_response() {
	if ( ! load_bricks_css_classes() ) {
		return new \WP_Error( 'unavailable', 'This Bricks version can\'t regenerate CSS files from here.', [ 'status' => 501 ] );
	}
	$files = \Bricks\Assets_Files::regenerate_css_files();
	bump_scan_version();
	return rest_ensure_response(
		[
			'files'       => is_array( $files ) ? count( $files ) : 0,
			'css_loading' => \Bricks\Database::get_setting( 'cssLoading' ) ?: 'inline',
		]
	);
}

/** Re-signs every Code element, SVG and query editor, like Bricks › Settings › Custom code › Regenerate. */
function regenerate_signatures_response() {
	if ( defined( 'BRICKS_LOCK_CODE_SIGNATURES' ) && BRICKS_LOCK_CODE_SIGNATURES ) {
		return new \WP_Error( 'locked', 'Code signatures are locked on this site (BRICKS_LOCK_CODE_SIGNATURES).', [ 'status' => 403 ] );
	}
	if ( class_exists( '\Bricks\Capabilities' ) && method_exists( '\Bricks\Capabilities', 'current_user_can_execute_code' ) && ! \Bricks\Capabilities::current_user_can_execute_code() ) {
		return new \WP_Error( 'forbidden', 'Your user isn\'t allowed to execute code in Bricks.', [ 'status' => 403 ] );
	}
	if ( ! class_exists( '\Bricks\Admin' ) || ! method_exists( '\Bricks\Admin', 'crawl_and_update_code_signatures' ) ) {
		return new \WP_Error( 'unavailable', 'This Bricks version can\'t regenerate code signatures from here.', [ 'status' => 501 ] );
	}
	if ( defined( 'BRICKS_CODE_SIGNATURES_LAST_GENERATED' ) ) {
		update_option( BRICKS_CODE_SIGNATURES_LAST_GENERATED, BRICKS_VERSION );
	}
	if ( defined( 'BRICKS_CODE_SIGNATURES_LAST_GENERATED_TIMESTAMP' ) ) {
		update_option( BRICKS_CODE_SIGNATURES_LAST_GENERATED_TIMESTAMP, time() );
	}
	$success = (bool) \Bricks\Admin::crawl_and_update_code_signatures();
	bump_scan_version();
	if ( $success && 'file' === \Bricks\Database::get_setting( 'cssLoading' ) && load_bricks_css_classes() ) {
		\Bricks\Assets_Files::regenerate_css_files();
	}
	return rest_ensure_response( [ 'success' => $success ] );
}

/** Flushes the object cache and every page cache plugin it recognizes. */
function clear_cache_response(): \WP_REST_Response {
	$cleared = [];
	if ( wp_cache_flush() ) {
		$cleared[] = 'Object cache';
	}
	$purges = [
		'LiteSpeed Cache'   => function () {
			if ( ! defined( 'LSCWP_V' ) ) {
				return false;
			}
			do_action( 'litespeed_purge_all' );
			return true;
		},
		'WP Rocket'         => fn() => function_exists( 'rocket_clean_domain' ) ? ( rocket_clean_domain() || true ) : false,
		'W3 Total Cache'    => fn() => function_exists( 'w3tc_flush_all' ) ? ( w3tc_flush_all() || true ) : false,
		'WP Super Cache'    => fn() => function_exists( 'wp_cache_clear_cache' ) ? ( wp_cache_clear_cache() || true ) : false,
		'WP Fastest Cache'  => fn() => function_exists( 'wpfc_clear_all_cache' ) ? ( wpfc_clear_all_cache( true ) || true ) : false,
		'SiteGround'        => fn() => function_exists( 'sg_cachepress_purge_cache' ) ? ( sg_cachepress_purge_cache() || true ) : false,
		'FlyingPress'       => fn() => class_exists( '\FlyingPress\Purge' ) && method_exists( '\FlyingPress\Purge', 'purge_everything' ) ? ( \FlyingPress\Purge::purge_everything() || true ) : false,
		'Breeze'            => function () {
			if ( ! defined( 'BREEZE_VERSION' ) ) {
				return false;
			}
			do_action( 'breeze_clear_all_cache' );
			return true;
		},
		'Hummingbird'       => function () {
			if ( ! class_exists( '\Hummingbird\WP_Hummingbird' ) ) {
				return false;
			}
			do_action( 'wphb_clear_page_cache' );
			return true;
		},
		'Autoptimize'       => fn() => class_exists( '\autoptimizeCache' ) ? ( \autoptimizeCache::clearall() || true ) : false,
		'Nginx Helper'      => function () {
			if ( ! defined( 'NGINX_HELPER_BASEPATH' ) ) {
				return false;
			}
			do_action( 'rt_nginx_helper_purge_all' );
			return true;
		},
		'Cloudflare (APO)'  => function () {
			if ( ! class_exists( '\CF\WordPress\Hooks' ) ) {
				return false;
			}
			do_action( 'cloudflare_purge_everything' );
			return true;
		},
		'Kinsta'            => function () {
			global $kinsta_cache;
			if ( ! isset( $kinsta_cache ) || ! is_object( $kinsta_cache ) || empty( $kinsta_cache->kinsta_cache_purge ) ) {
				return false;
			}
			$kinsta_cache->kinsta_cache_purge->purge_complete_caches();
			return true;
		},
	];
	foreach ( $purges as $name => $purge ) {
		try {
			if ( $purge() ) {
				$cleared[] = $name;
			}
		} catch ( \Throwable $e ) {
			continue;
		}
	}
	bump_scan_version();
	return rest_ensure_response( [ 'cleared' => $cleared ] );
}

/** Bricks' own groups are keys the builder translates (post, userProfile…); others are already labels. */
function tag_group_label( string $group ): string {
	if ( '' === $group || ! ctype_lower( $group[0] ) ) {
		return '' === $group ? 'Other' : $group;
	}
	return ucfirst( strtolower( (string) preg_replace( '/(?<!^)[A-Z]/', ' $0', $group ) ) );
}

/**
 * Every dynamic data tag the builder offers on this site: Bricks' own plus ACF, Meta Box, JetEngine,
 * Pods, Toolset, CMB2, WooCommerce and anything registered through bricks/dynamic_tags_list.
 */
function dynamic_tags_response() {
	if ( ! class_exists( '\Bricks\Integrations\Dynamic_Data\Providers' ) ) {
		return new \WP_Error( 'no_bricks', 'Bricks isn\'t the active theme.', [ 'status' => 409 ] );
	}

	$tags = [];
	$seen = [];
	foreach ( (array) \Bricks\Integrations\Dynamic_Data\Providers::get_dynamic_tags_list() as $tag ) {
		if ( ! is_array( $tag ) || empty( $tag['name'] ) || ! is_string( $tag['name'] ) ) {
			continue;
		}
		$name = '{' === $tag['name'][0] ? $tag['name'] : '{' . $tag['name'] . '}';
		if ( isset( $seen[ $name ] ) ) {
			continue;
		}
		$seen[ $name ] = true;
		$tags[]        = [
			'name'       => $name,
			'label'      => isset( $tag['label'] ) && is_string( $tag['label'] ) ? wp_strip_all_tags( $tag['label'] ) : $name,
			'group'      => isset( $tag['group'] ) && is_string( $tag['group'] ) ? tag_group_label( $tag['group'] ) : 'Other',
			'provider'   => isset( $tag['provider'] ) && is_string( $tag['provider'] ) && '' !== $tag['provider'] ? $tag['provider'] : null,
			'field_type' => isset( $tag['fieldType'] ) && is_string( $tag['fieldType'] ) ? $tag['fieldType'] : null,
		];
	}

	return rest_ensure_response( [ 'tags' => $tags ] );
}

/** Option holding the number that every cached scan's key includes; bumping it invalidates them all. */
const SCAN_VERSION_OPTION = 'bricks_raycast_scan_version';
/** How long a cached scan lives. */
const SCAN_CACHE_TTL = 10 * MINUTE_IN_SECONDS;

function scan_version(): int {
	return (int) get_option( SCAN_VERSION_OPTION, 0 );
}

/**
 * Invalidates every cached scan. Bumped again at shutdown, so a scan that ran while this request
 * was still writing (some hooks fire before the write) can't stay cached under the new version.
 */
function bump_scan_version(): void {
	static $at_shutdown = false;
	update_option( SCAN_VERSION_OPTION, scan_version() + 1, true );
	if ( ! $at_shutdown ) {
		$at_shutdown = true;
		add_action( 'shutdown', fn() => update_option( SCAN_VERSION_OPTION, scan_version() + 1, true ) );
	}
}

/**
 * Serves $build's data from a 10-minute transient keyed by endpoint, the request params in $vary,
 * the user (results are filtered by capability), their locale and the scan version.
 * fresh=1 skips the cache and refreshes it. WP_Errors are passed through and never cached.
 */
function cached_response( string $name, \WP_REST_Request $request, callable $build, array $vary = [] ) {
	$params = [];
	foreach ( $vary as $param ) {
		$value            = $request->get_param( $param );
		$params[ $param ] = is_scalar( $value ) ? (string) $value : $value;
	}
	$key = 'bricks_raycast_' . $name . '_' . md5(
		(string) wp_json_encode(
			[
				VERSION,
				scan_version(),
				get_current_user_id(),
				get_user_locale(),
				is_ssl(),
				$params,
			]
		)
	);

	$entry = rest_sanitize_boolean( $request->get_param( 'fresh' ) ) ? false : get_transient( $key );
	$hit   = is_array( $entry ) && array_key_exists( 'data', $entry );
	if ( ! $hit ) {
		$data = $build();
		if ( is_wp_error( $data ) ) {
			return $data;
		}
		if ( $data instanceof \WP_REST_Response ) {
			if ( $data->is_error() ) {
				return $data;
			}
			$data = $data->get_data();
		}
		$entry = [
			'data'         => $data,
			'generated_at' => time(),
		];
		set_transient( $key, $entry, SCAN_CACHE_TTL );
	}

	$data = $entry['data'];
	if ( is_array( $data ) && $data && ! wp_is_numeric_array( $data ) ) {
		$data['cached']       = $hit;
		$data['generated_at'] = (int) $entry['generated_at'];
	}
	return rest_ensure_response( $data );
}

/** Post meta keys the scans read: Bricks element data, template type/settings, and image details. */
function scanned_meta_keys(): array {
	return array_merge(
		array_keys( element_areas() ),
		[
			meta_key( 'BRICKS_DB_TEMPLATE_TYPE', '_bricks_template_type' ),
			meta_key( 'BRICKS_DB_TEMPLATE_SETTINGS', '_bricks_template_settings' ),
			'_bricks_page_content_2',
			'_bricks_page_header_2',
			'_bricks_page_footer_2',
			'_bricks_template_type',
			'_bricks_template_settings',
			'_wp_attachment_image_alt',
			'_wp_attachment_metadata',
			'_wp_attached_file',
			'_thumbnail_id',
			DECORATIVE_META,
		]
	);
}

/** Options the scans read (Bricks' constant names, plus their fallbacks in case they differ). */
function scanned_options(): array {
	$options = [
		'permalink_structure',
		'home',
		'bricks_global_classes_categories',
		'bricks_global_variables_categories',
		'bricks_global_classes_locked',
		class_trash_option(),
	];
	foreach (
		[
			'BRICKS_DB_GLOBAL_CLASSES'              => 'bricks_global_classes',
			'BRICKS_DB_GLOBAL_CLASSES_LOCKED'       => 'bricks_global_classes_locked',
			'BRICKS_DB_GLOBAL_CLASSES_CATEGORIES'   => 'bricks_global_classes_categories',
			'BRICKS_DB_GLOBAL_CLASSES_TRASH'        => 'bricks_global_classes_trash',
			'BRICKS_DB_GLOBAL_VARIABLES'            => 'bricks_global_variables',
			'BRICKS_DB_GLOBAL_VARIABLES_CATEGORIES' => 'bricks_global_variables_categories',
			'BRICKS_DB_GLOBAL_ELEMENTS'             => 'bricks_global_elements',
			'BRICKS_DB_COMPONENTS'                  => 'bricks_components',
			'BRICKS_DB_COLOR_PALETTE'               => 'bricks_color_palette',
			'BRICKS_DB_THEME_STYLES'                => 'bricks_theme_styles',
			'BRICKS_DB_GLOBAL_SETTINGS'             => 'bricks_global_settings',
			'BRICKS_DB_PSEUDO_CLASSES'              => 'bricks_global_pseudo_classes',
			'BRICKS_DB_BREAKPOINTS'                 => 'bricks_breakpoints',
		] as $constant => $fallback
	) {
		$options[] = meta_key( $constant, $fallback );
		$options[] = $fallback;
	}
	return array_values( array_unique( $options ) );
}

/** Meta hooks pass the key; only keys the scans read invalidate them. */
function maybe_bump_scan_version_for_meta( $meta_ids, $object_id, $meta_key ): void {
	if ( in_array( $meta_key, scanned_meta_keys(), true ) ) {
		bump_scan_version();
	}
}

// Anything that can change what /audit, /audit/images or /design return invalidates their cache.
foreach ( [ 'save_post', 'deleted_post', 'trashed_post', 'untrashed_post', 'add_attachment', 'edit_attachment', 'delete_attachment', 'profile_update', 'set_user_role', 'add_user_role', 'remove_user_role', 'switch_theme', 'activated_plugin', 'deactivated_plugin', 'upgrader_process_complete' ] as $hook ) {
	add_action( $hook, __NAMESPACE__ . '\bump_scan_version', 10, 0 );
}
foreach ( [ 'added_post_meta', 'updated_post_meta', 'deleted_post_meta' ] as $hook ) {
	add_action( $hook, __NAMESPACE__ . '\maybe_bump_scan_version_for_meta', 10, 3 );
}
// Bricks defines its option name constants in the theme, which loads after plugins.
add_action(
	'after_setup_theme',
	function () {
		foreach ( scanned_options() as $option ) {
			foreach ( [ "add_option_{$option}", "update_option_{$option}", "delete_option_{$option}" ] as $hook ) {
				add_action( $hook, __NAMESPACE__ . '\bump_scan_version', 10, 0 );
			}
		}
	}
);

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			REST_NAMESPACE,
			'/status',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\status_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/content',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\content_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
				'args'                => [
					'scope' => [
						'type'    => 'string',
						'enum'    => [ 'bricks', 'all' ],
						'default' => 'bricks',
					],
					'per_type' => [
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 5000,
					],
					'search'   => [
						'type' => 'string',
					],
				],
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/design',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\design_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/class/(?P<id>[A-Za-z0-9_-]+)',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\class_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/site',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\site_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/create',
			[
				'methods'             => 'POST',
				'callback'            => __NAMESPACE__ . '\create_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
				'args'                => [
					'type'          => [
						'type'     => 'string',
						'required' => true,
					],
					'title'         => [
						'type'     => 'string',
						'required' => true,
					],
					'template_type' => [
						'type' => 'string',
					],
				],
			]
		);
		// Submissions hold visitors' personal data: administrators only, like Bricks' own submissions screen.
		register_rest_route(
			REST_NAMESPACE,
			'/forms',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\forms_response',
				'permission_callback' => __NAMESPACE__ . '\can_manage',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/forms/submissions',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\submissions_response',
				'permission_callback' => __NAMESPACE__ . '\can_manage',
				'args'                => [
					'form_id'  => [ 'type' => 'string' ],
					'after_id' => [ 'type' => 'integer' ],
					'page'     => [ 'type' => 'integer' ],
					'per_page' => [ 'type' => 'integer' ],
				],
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/forms/submissions/delete',
			[
				'methods'             => 'POST',
				'callback'            => __NAMESPACE__ . '\delete_submissions_response',
				'permission_callback' => __NAMESPACE__ . '\can_manage',
				'args'                => [
					'ids' => [
						'type'     => 'array',
						'items'    => [ 'type' => 'integer' ],
						'required' => true,
					],
				],
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/health',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\health_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/tools/maintenance',
			[
				'methods'             => 'POST',
				'callback'            => __NAMESPACE__ . '\maintenance_response',
				'permission_callback' => __NAMESPACE__ . '\can_manage',
				'args'                => [
					'mode' => [
						'type'     => 'string',
						'required' => true,
					],
				],
			]
		);
		foreach ( [ 'regenerate-css' => 'regenerate_css_response', 'regenerate-signatures' => 'regenerate_signatures_response', 'clear-cache' => 'clear_cache_response' ] as $tool => $callback ) {
			register_rest_route(
				REST_NAMESPACE,
				"/tools/{$tool}",
				[
					'methods'             => 'POST',
					'callback'            => __NAMESPACE__ . '\\' . $callback,
					'permission_callback' => __NAMESPACE__ . '\can_manage',
				]
			);
		}
		register_rest_route(
			REST_NAMESPACE,
			'/library',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\library_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/library/template/(?P<id>\\d+)',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\library_template_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/library/component/(?P<id>[A-Za-z0-9_-]+)',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\library_component_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/audit',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\audit_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/audit/images',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\image_audit_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		foreach ( [ 'trash' => 'trash_classes_response', 'restore' => 'restore_classes_response' ] as $action => $callback ) {
			register_rest_route(
				REST_NAMESPACE,
				"/audit/{$action}-classes",
				[
					'methods'             => 'POST',
					'callback'            => __NAMESPACE__ . '\\' . $callback,
					'permission_callback' => __NAMESPACE__ . '\can_manage',
					'args'                => [
						'ids' => [
							'type'     => 'array',
							'items'    => [ 'type' => 'string' ],
							'required' => true,
						],
					],
				]
			);
		}
		register_rest_route(
			REST_NAMESPACE,
			'/attachment/(?P<id>\\d+)/alt',
			[
				'methods'             => 'POST',
				'callback'            => __NAMESPACE__ . '\attachment_alt_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
				'args'                => [
					'alt'        => [
						'type'    => 'string',
						'default' => '',
					],
					'decorative' => [
						'type'    => 'boolean',
						'default' => false,
					],
				],
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/search',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\search_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
				'args'                => [
					'q'       => [ 'type' => 'string' ],
					'element' => [ 'type' => 'string' ],
					'limit'   => [
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 500,
					],
				],
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/dynamic-tags',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\dynamic_tags_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
		register_rest_route(
			REST_NAMESPACE,
			'/post/(?P<id>\\d+)',
			[
				'methods'             => 'GET',
				'callback'            => __NAMESPACE__ . '\post_response',
				'permission_callback' => __NAMESPACE__ . '\can_use',
			]
		);
	}
);
