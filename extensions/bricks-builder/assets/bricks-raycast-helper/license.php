<?php
/**
 * Bricks Raycast Pro: the license key, its daily check, which endpoints need it, and plugin updates
 * for licensed sites. Keys are activated per site through the license server, which talks to Creem.
 */

namespace BricksRaycastHelper;

defined( 'ABSPATH' ) || exit;

const LICENSE_OPTION      = 'bricks_raycast_license';
const LICENSE_CRON        = 'bricks_raycast_license_check';
const UPDATE_INFO_OPTION  = 'bricks_raycast_update_info';
const PLUGIN_SLUG         = 'bricks-raycast-helper';
const LICENSE_GRACE_DAYS  = 7;
const DEFAULT_LICENSE_URL = 'https://license.martej.com';

/**
 * Endpoints that need a Pro license: Site Audit, element and dynamic data search, Form Submissions, the Template Library and site tools.
 * Case-insensitive, because WordPress matches REST routes that way (/Audit reaches /audit).
 */
const PRO_ROUTE_PATTERN = '#^/' . REST_NAMESPACE . '/(audit|attachment|search|dynamic-tags|forms|tools|library)(/|$)#i';

/** The license server, without a trailing slash. Set BRICKS_RAYCAST_LICENSE_SERVER in wp-config.php to test against another one. */
function license_server(): string {
	$url = defined( 'BRICKS_RAYCAST_LICENSE_SERVER' ) ? (string) BRICKS_RAYCAST_LICENSE_SERVER : DEFAULT_LICENSE_URL;
	return untrailingslashit( $url );
}

/** Where to buy Pro: the product page on martej.com, with the plans. */
function buy_url(): string {
	return PRODUCT_URL;
}

function plugin_basename_(): string {
	return plugin_basename( PLUGIN_FILE );
}

/** The stored license: key, instance_id, status, valid, expires_at, activations, activation_limit, checked_at, last_valid_at, error. */
function license(): array {
	$license = get_option( LICENSE_OPTION, [] );
	return is_array( $license ) ? $license : [];
}

function save_license( array $license ): void {
	$was_pro = is_pro();
	update_option( LICENSE_OPTION, $license, false );
	if ( is_pro() !== $was_pro ) {
		forget_update_offer();
	}
}

/** Pro turned on or off: the update offer's package changes, so Dashboard › Updates has to ask again. */
function forget_update_offer(): void {
	forget_update_info();
	delete_site_transient( 'update_plugins' );
}

/** Notes a failed license check without throwing away the last known state when the server was only unreachable. */
function record_license_error( array $license, \WP_Error $error ): array {
	$license['checked_at'] = time();
	$license['error']      = $error->get_error_message();
	if ( ! is_transient_license_error( $error ) ) {
		// The key or this site's activation is gone.
		$license['valid']         = false;
		$license['status']        = $error->get_error_code();
		$license['last_valid_at'] = 0;
	}
	return $license;
}

/** POSTs (or GETs, without a body) JSON to the license server. */
function license_request( string $path, ?array $body = null ) {
	$args     = [
		'timeout' => 15,
		'headers' => [
			'Accept'       => 'application/json',
			'Content-Type' => 'application/json',
		],
	];
	$url      = license_server() . $path;
	$response = null === $body ? wp_remote_get( $url, $args ) : wp_remote_post( $url, $args + [ 'body' => wp_json_encode( $body ) ] );
	if ( is_wp_error( $response ) ) {
		return new \WP_Error( 'unavailable', 'The license server couldn\'t be reached: ' . $response->get_error_message(), [ 'status' => 502 ] );
	}
	$status = (int) wp_remote_retrieve_response_code( $response );
	$data   = json_decode( (string) wp_remote_retrieve_body( $response ), true );
	if ( ! is_array( $data ) ) {
		return new \WP_Error( 'unavailable', "The license server returned an unexpected answer (HTTP {$status}).", [ 'status' => 502 ] );
	}
	if ( $status >= 400 ) {
		return new \WP_Error( (string) ( $data['code'] ?? 'license_error' ), (string) ( $data['message'] ?? "HTTP {$status}" ), [ 'status' => $status >= 500 ? 502 : 400 ] );
	}
	return $data;
}

/** Errors that say nothing about the license itself, so the last known state stays. */
function is_transient_license_error( \WP_Error $error ): bool {
	return in_array( $error->get_error_code(), [ 'unavailable', 'server_config' ], true );
}

/** Merges the server's view of the license into what's stored. */
function apply_license_state( array $license, array $state ): array {
	$valid = ! empty( $state['valid'] );
	return array_merge(
		$license,
		[
			'valid'            => $valid,
			'status'           => (string) ( $state['status'] ?? 'inactive' ),
			'expires_at'       => $state['expires_at'] ?? null,
			'activations'      => isset( $state['activations'] ) ? (int) $state['activations'] : null,
			'activation_limit' => isset( $state['activation_limit'] ) ? (int) $state['activation_limit'] : null,
			'checked_at'       => time(),
			'last_valid_at'    => $valid ? time() : 0,
			'error'            => '',
		]
	);
}

/** Activates a key for this site, replacing (and freeing) the one before it. */
function activate_license( string $key ) {
	$key     = trim( $key );
	$current = license();
	if ( '' === $key ) {
		return new \WP_Error( 'missing_key', 'Enter a license key.', [ 'status' => 400 ] );
	}
	if ( ( $current['key'] ?? '' ) === $key && ! empty( $current['instance_id'] ) ) {
		return validate_license();
	}

	// Activate the new key first: if it fails, the site keeps the license it has.
	$result = license_request( '/v1/activate', [ 'key' => $key, 'site' => home_url() ] );
	if ( is_wp_error( $result ) ) {
		return $result;
	}
	if ( ! empty( $current['key'] ) && ! empty( $current['instance_id'] ) && $current['key'] !== $key ) {
		// Free the old key's activation now that the new one works.
		license_request( '/v1/deactivate', [ 'key' => $current['key'], 'instance_id' => $current['instance_id'] ] );
	}
	$license = apply_license_state(
		[
			'key'         => $key,
			'instance_id' => (string) ( $result['instance_id'] ?? '' ),
		],
		(array) ( $result['license'] ?? [] )
	);
	save_license( $license );
	schedule_license_check();
	forget_update_info();
	return $license;
}

/** Asks the license server whether this site's license is still good. */
function validate_license() {
	$license = license();
	if ( empty( $license['key'] ) ) {
		return $license;
	}
	if ( empty( $license['instance_id'] ) ) {
		// A reactivation (or a deactivation) that failed left the key without an activation: take one now,
		// or the license would never be checked again.
		$result = activate_license( (string) $license['key'] );
		if ( is_wp_error( $result ) ) {
			save_license( record_license_error( license(), $result ) );
		}
		return $result;
	}
	$result = license_request(
		'/v1/validate',
		[
			'key'         => $license['key'],
			'instance_id' => $license['instance_id'],
		]
	);
	if ( is_wp_error( $result ) && 'reactivate' === $result->get_error_code() ) {
		// The server wants this site to take a fresh activation (sites from the free local-site test phase).
		$license['instance_id'] = '';
		save_license( $license );
		return validate_license();
	}
	if ( is_wp_error( $result ) ) {
		$license = record_license_error( $license, $result );
		save_license( $license );
		return $license;
	}
	$license = apply_license_state( $license, (array) ( $result['license'] ?? [] ) );
	save_license( $license );
	return $license;
}

/**
 * Frees this site's activation and forgets the key. The key is forgotten even when the license server
 * can't be reached, so a site can always drop its license; the answer then carries a warning.
 */
function deactivate_license(): array {
	$license = license();
	$warning = null;
	if ( ! empty( $license['key'] ) && ! empty( $license['instance_id'] ) ) {
		$result = license_request( '/v1/deactivate', [ 'key' => $license['key'], 'instance_id' => $license['instance_id'] ] );
		if ( is_wp_error( $result ) && is_transient_license_error( $result ) ) {
			$warning = 'The license server couldn\'t be reached, so the activation may still count on the license.';
		}
	}
	$was_pro = is_pro();
	delete_option( LICENSE_OPTION );
	wp_clear_scheduled_hook( LICENSE_CRON );
	if ( $was_pro ) {
		forget_update_offer();
	} else {
		forget_update_info();
	}
	return $warning ? [ 'warning' => $warning ] : [];
}

/**
 * Whether Pro features are on. A license that was valid stays on for a week of failed checks, so a
 * license server outage doesn't lock anyone out; an expiry date in the past turns it off right away.
 */
function is_pro(): bool {
	$license = license();
	if ( empty( $license['key'] ) || empty( $license['valid'] ) ) {
		return false;
	}
	if ( ! empty( $license['expires_at'] ) && strtotime( (string) $license['expires_at'] ) <= time() ) {
		return false;
	}
	return time() - (int) ( $license['last_valid_at'] ?? 0 ) < ( LICENSE_GRACE_DAYS + 1 ) * DAY_IN_SECONDS;
}

/** The license as Raycast and the settings page see it. Only administrators get the key's last characters. */
function license_summary(): array {
	$license = license();
	$summary = [
		'active'           => is_pro(),
		'status'           => empty( $license['key'] ) ? 'none' : (string) ( $license['status'] ?? 'inactive' ),
		'expires_at'       => $license['expires_at'] ?? null,
		'checked_at'       => ! empty( $license['checked_at'] ) ? gmdate( 'c', (int) $license['checked_at'] ) : null,
		'error'            => (string) ( $license['error'] ?? '' ),
		'buy_url'          => buy_url(),
		'settings_url'     => admin_url( 'options-general.php?page=' . PLUGIN_SLUG ),
	];
	if ( can_manage() ) {
		$summary['key_hint']         = empty( $license['key'] ) ? null : '…' . substr( (string) $license['key'], -4 );
		$summary['activations']      = $license['activations'] ?? null;
		$summary['activation_limit'] = $license['activation_limit'] ?? null;
	}
	return $summary;
}

function license_status_message(): string {
	$license = license();
	if ( empty( $license['key'] ) ) {
		return 'Site Audit, element and dynamic data search, Form Submissions, the Template Library and site tools need a Bricks Raycast Pro license. Add your key in Raycast (Manage Sites › Add License Key) or under Settings › Bricks Raycast.';
	}
	$status = (string) ( $license['status'] ?? '' );
	if ( 'expired' === $status || ( ! empty( $license['expires_at'] ) && strtotime( (string) $license['expires_at'] ) <= time() ) ) {
		return 'The Bricks Raycast Pro license on this site has expired. Renew it to keep using Site Audit, element and dynamic data search, Form Submissions, the Template Library and site tools.';
	}
	if ( ! empty( $license['valid'] ) ) {
		return 'The Bricks Raycast Pro license couldn\'t be checked for over a week. Check that this site can reach ' . license_server() . '.';
	}
	return 'The Bricks Raycast Pro license on this site isn\'t active (' . ( $status ?: 'inactive' ) . '). Check the key under Settings › Bricks Raycast.';
}

/** Pro endpoints answer 402 without a license, but only to users the endpoint's permission check lets in. */
function require_pro_license( $response, $handler, \WP_REST_Request $request ) {
	if ( is_wp_error( $response ) || is_pro() || ! preg_match( PRO_ROUTE_PATTERN, $request->get_route() ) ) {
		return $response;
	}
	// This filter runs before permission_callback. Run it here first: when it says no, WordPress
	// answers 401/403 itself right after, and signed-out visitors learn nothing about the license.
	if ( ! empty( $handler['permission_callback'] ) && is_callable( $handler['permission_callback'] ) ) {
		$allowed = call_user_func( $handler['permission_callback'], $request );
		if ( ! $allowed || is_wp_error( $allowed ) ) {
			return $response;
		}
	}
	$summary = license_summary();
	return new \WP_Error(
		'bricks_raycast_pro_required',
		license_status_message(),
		[
			'status'  => 402,
			// Enough for Raycast to say what's wrong and where to fix it; activation counts stay on /license.
			'license' => array_intersect_key( $summary, array_flip( [ 'active', 'status', 'expires_at', 'buy_url', 'settings_url' ] ) ),
		]
	);
}
add_filter( 'rest_request_before_callbacks', __NAMESPACE__ . '\require_pro_license', 10, 3 );

function license_response( \WP_REST_Request $request ) {
	if ( $request->get_param( 'refresh' ) ) {
		validate_license();
	}
	return rest_ensure_response( license_summary() );
}

function save_license_response( \WP_REST_Request $request ) {
	$result = activate_license( (string) $request->get_param( 'key' ) );
	return is_wp_error( $result ) ? $result : rest_ensure_response( license_summary() );
}

function remove_license_response() {
	$result = deactivate_license();
	return rest_ensure_response( license_summary() + $result );
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			REST_NAMESPACE,
			'/license',
			[
				[
					'methods'             => 'GET',
					'callback'            => __NAMESPACE__ . '\license_response',
					'permission_callback' => __NAMESPACE__ . '\can_manage',
					'args'                => [ 'refresh' => [ 'type' => 'boolean' ] ],
				],
				[
					'methods'             => 'POST',
					'callback'            => __NAMESPACE__ . '\save_license_response',
					'permission_callback' => __NAMESPACE__ . '\can_manage',
					'args'                => [
						'key' => [
							'type'     => 'string',
							'required' => true,
						],
					],
				],
				[
					'methods'             => 'DELETE',
					'callback'            => __NAMESPACE__ . '\remove_license_response',
					'permission_callback' => __NAMESPACE__ . '\can_manage',
				],
			]
		);
	}
);

// Daily check.

function schedule_license_check(): void {
	if ( ! wp_next_scheduled( LICENSE_CRON ) ) {
		wp_schedule_event( time() + DAY_IN_SECONDS, 'daily', LICENSE_CRON );
	}
}

add_action( LICENSE_CRON, __NAMESPACE__ . '\validate_license' );
add_action(
	'init',
	function () {
		if ( ! empty( license()['key'] ) ) {
			schedule_license_check();
		}
	}
);

// Deactivating the plugin frees the site's activation; activating it again takes it back.
register_deactivation_hook(
	PLUGIN_FILE,
	function () {
		$license = license();
		if ( ! empty( $license['key'] ) && ! empty( $license['instance_id'] ) ) {
			$result = license_request( '/v1/deactivate', [ 'key' => $license['key'], 'instance_id' => $license['instance_id'] ] );
			// Only forget the activation once the server freed it; otherwise the next check still finds it.
			if ( ! is_wp_error( $result ) ) {
				$license['instance_id'] = '';
				$license['valid']       = false;
				save_license( $license );
			}
		}
		wp_clear_scheduled_hook( LICENSE_CRON );
	}
);
register_activation_hook(
	PLUGIN_FILE,
	function () {
		$license = license();
		if ( ! empty( $license['key'] ) && empty( $license['instance_id'] ) ) {
			activate_license( (string) $license['key'] );
		}
	}
);

// Updates. The latest version is public; the zip is only handed to sites with a valid license.

function update_info(): ?array {
	$cached = get_site_option( UPDATE_INFO_OPTION );
	// Dashboard › Updates › Check again asks the license server too.
	$forced = is_admin() && ! empty( $_GET['force-check'] ); // phpcs:ignore WordPress.Security.NonceVerification
	if ( ! $forced && is_array( $cached ) && ( $cached['fetched_at'] ?? 0 ) > time() - ( empty( $cached['info'] ) ? HOUR_IN_SECONDS : 12 * HOUR_IN_SECONDS ) ) {
		return $cached['info'] ?: null;
	}
	$info = license_request( '/v1/update' );
	$info = is_wp_error( $info ) || empty( $info['version'] ) ? null : $info;
	update_site_option(
		UPDATE_INFO_OPTION,
		[
			'fetched_at' => time(),
			'info'       => $info,
		]
	);
	return $info;
}

function forget_update_info(): void {
	delete_site_option( UPDATE_INFO_OPTION );
}

function download_url(): string {
	return license_server() . '/v1/download';
}

function update_offer( array $info ): object {
	return (object) [
		'id'             => PLUGIN_SLUG,
		'slug'           => PLUGIN_SLUG,
		'plugin'         => plugin_basename_(),
		'new_version'    => (string) $info['version'],
		'url'            => license_server(),
		// Without a license WordPress still shows the update, with "Automatic update is unavailable".
		'package'        => is_pro() ? download_url() : '',
		'requires'       => (string) ( $info['requires'] ?? '' ),
		'requires_php'   => (string) ( $info['requires_php'] ?? '' ),
		'tested'         => (string) ( $info['tested'] ?? '' ),
		'upgrade_notice' => is_pro() ? '' : 'Add a Bricks Raycast Pro license under Settings › Bricks Raycast to update.',
	];
}

add_filter(
	'pre_set_site_transient_update_plugins',
	function ( $transient ) {
		if ( ! is_object( $transient ) || empty( $transient->checked ) ) {
			return $transient;
		}
		$info = update_info();
		if ( ! $info ) {
			return $transient;
		}
		$offer = update_offer( $info );
		if ( version_compare( $offer->new_version, VERSION, '>' ) ) {
			$transient->response[ plugin_basename_() ] = $offer;
		} else {
			unset( $transient->response[ plugin_basename_() ] );
			$transient->no_update[ plugin_basename_() ] = $offer;
		}
		return $transient;
	}
);

// "View details" in Plugins and Dashboard › Updates.
add_filter(
	'plugins_api',
	function ( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || PLUGIN_SLUG !== ( $args->slug ?? '' ) ) {
			return $result;
		}
		$info = update_info();
		if ( ! $info ) {
			return $result;
		}
		return (object) [
			'name'          => 'Bricks Raycast Helper',
			'slug'          => PLUGIN_SLUG,
			'version'       => (string) $info['version'],
			'author'        => 'Matej',
			'requires'      => (string) ( $info['requires'] ?? '' ),
			'requires_php'  => (string) ( $info['requires_php'] ?? '' ),
			'tested'        => (string) ( $info['tested'] ?? '' ),
			'last_updated'  => (string) ( $info['released_at'] ?? '' ),
			'download_link' => is_pro() ? download_url() : '',
			'sections'      => [
				'description' => 'REST endpoints for the Bricks Builder Raycast extension.',
				'changelog'   => wp_kses_post( (string) ( $info['changelog'] ?? '' ) ),
			],
		];
	},
	10,
	3
);

// The download proves the license with headers, so the key never ends up in a URL or a log.
add_filter(
	'http_request_args',
	function ( $args, $url ) {
		if ( 0 !== strpos( (string) $url, download_url() ) ) {
			return $args;
		}
		$license                          = license();
		$args['headers']                  = (array) ( $args['headers'] ?? [] );
		$args['headers']['X-License-Key'] = (string) ( $license['key'] ?? '' );
		$args['headers']['X-Instance-Id'] = (string) ( $license['instance_id'] ?? '' );
		// WordPress sends the same headers again on a redirect, which could hand the key to another host.
		// The license server serves the zip itself, so there's nothing to follow.
		$args['redirection'] = 0;
		return $args;
	},
	10,
	2
);

add_action( 'upgrader_process_complete', __NAMESPACE__ . '\forget_update_info' );

// Settings › Bricks Raycast.

add_action(
	'admin_menu',
	function () {
		add_options_page( 'Bricks Raycast', 'Bricks Raycast', 'manage_options', PLUGIN_SLUG, __NAMESPACE__ . '\render_settings_page' );
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( PLUGIN_FILE ),
	function ( array $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=' . PLUGIN_SLUG ) ) . '">License</a>' );
		return $links;
	}
);

add_action(
	'admin_post_bricks_raycast_license',
	function () {
		if ( ! can_manage() ) {
			wp_die( 'Sorry, you are not allowed to do that.', 403 );
		}
		check_admin_referer( 'bricks_raycast_license' );
		$action = sanitize_key( (string) ( $_POST['license_action'] ?? '' ) );
		if ( 'activate' === $action ) {
			$result = activate_license( sanitize_text_field( wp_unslash( (string) ( $_POST['license_key'] ?? '' ) ) ) );
		} elseif ( 'deactivate' === $action ) {
			$result = deactivate_license();
		} else {
			$result = validate_license();
		}
		// Kept on the server, so the page never shows text that came in through the URL.
		if ( is_wp_error( $result ) ) {
			set_transient( license_notice_key(), [ 'error', $result->get_error_message() ], MINUTE_IN_SECONDS );
		} elseif ( ! empty( $result['warning'] ) ) {
			set_transient( license_notice_key(), [ 'warning', (string) $result['warning'] ], MINUTE_IN_SECONDS );
		}
		wp_safe_redirect( admin_url( 'options-general.php?page=' . PLUGIN_SLUG ) );
		exit;
	}
);

/** The settings page's one-time notice for the current user. */
function license_notice_key(): string {
	return 'bricks_raycast_license_notice_' . get_current_user_id();
}

/** The Raycast extension's page on martej.com. */
const PRODUCT_URL = 'https://martej.com/bricks-raycast';
const MARTEJ_URL  = 'https://martej.com';

/** Small stroke icons for the settings page (24px grid, 1.75 stroke). */
function settings_icon( string $name ): string {
	$paths = [
		'check'    => '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
		'lock'     => '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
		'external' => '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>',
		'copy'     => '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2"/>',
	];
	return '<svg class="brx-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . ( $paths[ $name ] ?? '' ) . '</svg>';
}

/** The extension's icon: a yellow tile with a brick wall. */
function settings_logo(): string {
	$bricks = [ [ 19, 23, 28, 16 ], [ 51, 23, 31, 16 ], [ 19, 43, 16, 16 ], [ 37, 43, 28, 16 ], [ 67, 43, 15, 16 ], [ 19, 62, 28, 16 ], [ 51, 62, 31, 16 ] ];
	$rects  = '';
	foreach ( $bricks as [ $x, $y, $w, $h ] ) {
		$rects .= sprintf( '<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="#212121"/>', $x, $y, $w, $h );
	}
	return '<svg class="brx-logo" viewBox="0 0 100 100" width="44" height="44" aria-hidden="true" focusable="false"><rect x="3" y="3" width="94" height="94" rx="22" fill="#FFD600"/>' . $rects . '</svg>';
}

function render_settings_page(): void {
	$license    = license();
	$summary    = license_summary();
	$notice     = get_transient( license_notice_key() );
	$has_key    = ! empty( $license['key'] );
	$active     = (bool) $summary['active'];
	$user       = wp_get_current_user();
	$app_pw_ok  = function_exists( 'wp_is_application_passwords_available' ) && wp_is_application_passwords_available();
	$update     = update_info();
	$has_update = $update && version_compare( (string) $update['version'], VERSION, '>' );
	$date       = static fn( $iso ) => wp_date( get_option( 'date_format' ), strtotime( (string) $iso ) );

	if ( false !== $notice ) {
		delete_transient( license_notice_key() );
	}
	$notice = is_array( $notice ) && 2 === count( $notice ) ? $notice : null;

	if ( $active ) {
		$state = [ 'good', 'Active' ];
	} elseif ( ! $has_key ) {
		$state = [ 'none', 'Not activated' ];
	} else {
		$state = [ 'bad', ucfirst( str_replace( '_', ' ', (string) $summary['status'] ) ) ];
	}

	$free = [ 'Open in Bricks and creating pages and templates', 'Global classes, colors and variables', 'Dynamic data tags in the builder', 'Bricks Site Info and Bricks Site Health', 'Snippets, shortcuts and docs search' ];
	$pro  = [ 'Site Audit, with images and alt text', 'Search Bricks Elements and Dynamic Data', 'Template Library across your sites', 'Form Submissions and the menu bar count', 'Maintenance mode, CSS, caches and code signatures', 'Helper plugin updates' ];

	add_thickbox();
	$changelog_url = admin_url( 'plugin-install.php?tab=plugin-information&plugin=' . PLUGIN_SLUG . '&TB_iframe=true&width=640&height=560' );
	?>
	<style>
		.brx { --brx-ink: #1d2327; --brx-muted: #50575e; --brx-line: #dcdcde; --brx-soft: #f6f7f7; --brx-yellow: #ffd600; --brx-good: #00752d; --brx-good-bg: #edfaef; --brx-bad: #b32d2e; --brx-bad-bg: #fcf0f1; max-width: 1120px; color: var(--brx-ink); }
		.brx * { box-sizing: border-box; }
		.brx ::selection { background: var(--brx-yellow); color: #1d2327; }
		.brx-icon { flex: none; vertical-align: -3px; }
		.brx-head { display: flex; align-items: center; gap: 16px; margin: 22px 0 24px; flex-wrap: wrap; }
		.brx-head .brx-logo { flex: none; filter: drop-shadow(0 2px 6px rgba(29, 35, 39, .14)); }
		.brx-head h1 { margin: 0; padding: 0; font-size: 23px; font-weight: 600; line-height: 1.2; }
		.brx-head p { margin: 4px 0 0; color: var(--brx-muted); }
		.brx-head nav { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
		.brx-head nav a { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; color: var(--brx-ink); text-decoration: none; }
		.brx-head nav a:hover { background: #fff; color: #2271b1; }
		.brx-head nav a:focus { box-shadow: 0 0 0 2px #2271b1; outline: 2px solid transparent; }
		.brx-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start; }
		.brx-main, .brx-side { display: grid; gap: 20px; }
		.brx-panel { background: #fff; border: 1px solid var(--brx-line); border-radius: 10px; padding: 22px 24px; box-shadow: 0 1px 2px rgba(29, 35, 39, .04); }
		.brx-panel h2 { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
		.brx-panel > p { max-width: 68ch; color: var(--brx-muted); margin: 6px 0 0; }
		.brx-license-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
		.brx-pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 20px; background: var(--brx-soft); color: var(--brx-muted); }
		.brx-pill::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
		.brx-pill.is-good { background: var(--brx-good-bg); color: var(--brx-good); }
		.brx-pill.is-bad { background: var(--brx-bad-bg); color: var(--brx-bad); }
		.brx-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; margin: 20px 0 0; border: 1px solid var(--brx-line); border-radius: 8px; overflow: hidden; }
		.brx-facts div { padding: 12px 16px; border-left: 1px solid var(--brx-line); }
		.brx-facts div:first-child { border-left: 0; }
		.brx-facts dt { font-size: 12px; color: var(--brx-muted); margin: 0 0 2px; }
		.brx-facts dd { margin: 0; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
		.brx-facts dd small { display: block; font-weight: 400; font-size: 12px; color: var(--brx-muted); }
		.brx-message { margin: 16px 0 0; padding: 10px 14px; border-radius: 8px; background: var(--brx-bad-bg); color: #8a2424; max-width: 72ch; }
		.brx-keyrow { display: flex; align-items: center; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
		.brx-key { font-family: Menlo, Consolas, monospace; font-size: 13px; padding: 4px 10px; border-radius: 6px; background: var(--brx-soft); border: 1px solid var(--brx-line); letter-spacing: .04em; }
		.brx-keyrow input[type="text"] { width: min(100%, 360px); font-family: Menlo, Consolas, monospace; }
		.brx-link-danger { background: none; border: 0; padding: 4px 6px; color: var(--brx-bad); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; font-size: 13px; }
		.brx-link-danger:hover { color: #8a2424; }
		.brx-link-danger:focus { box-shadow: 0 0 0 2px #2271b1; outline: 2px solid transparent; border-radius: 3px; }
		.brx-buy { margin: 14px 0 0; color: var(--brx-muted); }
		.brx-buy a { font-weight: 600; text-underline-offset: 3px; }
		.brx-steps { list-style: none; margin: 18px 0 0; padding: 0; counter-reset: brx-step; display: grid; gap: 18px; }
		.brx-steps li { counter-increment: brx-step; display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 0 14px; margin: 0; }
		.brx-steps li > * { grid-column: 2; }
		.brx-steps li::before { content: counter(brx-step); grid-column: 1; grid-row: 1 / span 8; align-self: start; width: 28px; height: 28px; border-radius: 50%; background: var(--brx-yellow); color: #1d2327; font-weight: 700; font-size: 13px; display: grid; place-items: center; }
		.brx-steps strong { display: block; font-size: 14px; line-height: 28px; }
		.brx-steps p { margin: 0; color: var(--brx-muted); max-width: 64ch; }
		.brx-steps .button { margin-top: 8px; }
		.brx-copy { display: grid; grid-template-columns: max-content minmax(0, 1fr) max-content; gap: 8px 12px; align-items: center; margin-top: 10px; max-width: 560px; }
		.brx-copy span { color: var(--brx-muted); font-size: 12px; }
		.brx-copy code { background: var(--brx-soft); border: 1px solid var(--brx-line); border-radius: 6px; padding: 4px 8px; font-size: 13px; overflow-wrap: anywhere; margin: 0; }
		.brx-copy .button { display: inline-flex; align-items: center; gap: 4px; }
		.brx-warn { margin-top: 8px; color: #8a4b00; }
		.brx-list { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
		.brx-list li { display: flex; gap: 8px; margin: 0; line-height: 1.45; }
		.brx-list .brx-icon { margin-top: 1px; vertical-align: 0; }
		.brx-list.is-free .brx-icon { color: var(--brx-muted); }
		.brx-list.is-pro .brx-icon { color: <?php echo $active ? 'var(--brx-good)' : '#8c8f94'; ?>; }
		.brx-side h3 { margin: 22px 0 0; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
		.brx-side h3:first-of-type { margin-top: 14px; }
		.brx-tag { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 4px; background: var(--brx-yellow); color: #1d2327; }
		.brx-about { margin: 12px 0 0; display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 16px; }
		.brx-about dt { color: var(--brx-muted); margin: 0; }
		.brx-about dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
		.brx-foot { margin: 24px 0 8px; color: var(--brx-muted); display: flex; align-items: center; gap: 6px; }
		@media (max-width: 960px) {
			.brx-grid { grid-template-columns: minmax(0, 1fr); }
			.brx-head nav { margin-left: 0; width: 100%; }
		}
		@media (max-width: 600px) {
			.brx-facts { grid-template-columns: minmax(0, 1fr); }
			.brx-facts div { border-left: 0; border-top: 1px solid var(--brx-line); }
			.brx-facts div:first-child { border-top: 0; }
			.brx-panel { padding: 18px; }
			.brx-copy { grid-template-columns: minmax(0, 1fr) max-content; }
			.brx-copy span { grid-column: 1 / -1; margin-bottom: -4px; }
		}
	</style>
	<div class="wrap brx">
		<header class="brx-head">
			<?php echo settings_logo(); // phpcs:ignore WordPress.Security.EscapeOutput -- static markup ?>
			<div>
				<h1>Bricks Raycast</h1>
				<p>Connects this site to the Bricks Builder extension for Raycast. Helper plugin <?php echo esc_html( VERSION ); ?>.</p>
			</div>
			<nav aria-label="Bricks Raycast links">
				<a href="<?php echo esc_url( PRODUCT_URL ); ?>" target="_blank" rel="noopener">Raycast extension <?php echo settings_icon( 'external' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
				<a href="<?php echo esc_url( $changelog_url ); ?>" class="thickbox open-plugin-details-modal">Changelog</a>
				<a href="<?php echo esc_url( MARTEJ_URL ); ?>" target="_blank" rel="noopener">martej.com <?php echo settings_icon( 'external' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
			</nav>
		</header>

		<?php if ( $notice ) : ?>
			<div class="notice notice-<?php echo 'warning' === $notice[0] ? 'warning' : 'error'; ?>"><p><?php echo esc_html( (string) $notice[1] ); ?></p></div>
		<?php endif; ?>

		<div class="brx-grid">
			<div class="brx-main">
				<section class="brx-panel" aria-labelledby="brx-license">
					<div class="brx-license-top">
						<h2 id="brx-license">Bricks Raycast Pro</h2>
						<span class="brx-pill is-<?php echo esc_attr( $state[0] ); ?>"><?php echo esc_html( $state[1] ); ?></span>
					</div>
					<p>
						<?php if ( $active ) : ?>
							Pro features are on for this site in Raycast, and plugin updates arrive under Dashboard › Updates.
						<?php else : ?>
							Site Audit, element and dynamic data search, Form Submissions, the Template Library and the site tools need a Pro license, and so do plugin updates. Everything else is free.
						<?php endif; ?>
					</p>

					<?php if ( $has_key ) : ?>
						<dl class="brx-facts">
							<div>
								<dt><?php echo $active ? 'Renews' : 'Expiry'; ?></dt>
								<dd><?php echo ! empty( $summary['expires_at'] ) ? esc_html( $date( $summary['expires_at'] ) ) : 'Never'; ?><small><?php echo empty( $summary['expires_at'] ) ? 'Lifetime license' : 'Yearly license'; ?></small></dd>
							</div>
							<div>
								<dt>Sites</dt>
								<dd>
									<?php if ( isset( $summary['activations'] ) ) : ?>
										<?php echo (int) $summary['activations']; ?> of <?php echo null === $summary['activation_limit'] ? 'unlimited' : (int) $summary['activation_limit']; ?> used
									<?php else : ?>
										–
									<?php endif; ?>
									<small>One per site</small>
								</dd>
							</div>
							<div>
								<dt>Last checked</dt>
								<dd><?php echo ! empty( $license['checked_at'] ) ? esc_html( sprintf( '%s ago', human_time_diff( (int) $license['checked_at'] ) ) ) : '–'; ?><small>Checked daily</small></dd>
							</div>
						</dl>
						<?php if ( ! $active ) : ?>
							<p class="brx-message"><?php echo esc_html( license_status_message() ); ?></p>
						<?php elseif ( ! empty( $summary['error'] ) ) : ?>
							<p class="brx-message"><?php echo esc_html( 'Last check failed: ' . $summary['error'] ); ?></p>
						<?php endif; ?>
					<?php endif; ?>

					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<?php wp_nonce_field( 'bricks_raycast_license' ); ?>
						<input type="hidden" name="action" value="bricks_raycast_license">
						<?php if ( ! $has_key ) : ?>
							<div class="brx-keyrow">
								<label for="brx-key" class="screen-reader-text">License key</label>
								<input type="text" id="brx-key" name="license_key" class="regular-text" placeholder="Paste your license key" autocomplete="off" spellcheck="false" required>
								<button type="submit" name="license_action" value="activate" class="button button-primary">Activate license</button>
							</div>
							<p class="brx-buy">No key yet? <a href="<?php echo esc_url( $summary['buy_url'] ); ?>" target="_blank" rel="noopener">Get Bricks Raycast Pro</a> from €29 a year, or add your key from Raycast with Bricks Raycast Pro.</p>
						<?php else : ?>
							<div class="brx-keyrow">
								<span class="brx-key" title="Your license key, shortened"><?php echo esc_html( (string) $summary['key_hint'] ); ?></span>
								<button type="submit" name="license_action" value="check" class="button">Check now</button>
								<?php if ( ! $active ) : ?>
									<a class="button button-primary" href="<?php echo esc_url( $summary['buy_url'] ); ?>" target="_blank" rel="noopener">Renew or buy</a>
								<?php endif; ?>
								<button type="submit" name="license_action" value="deactivate" class="brx-link-danger" onclick="return confirm('Deactivate the license on this site? Pro features stop here, and the activation is free to use on another site.');">Deactivate on this site</button>
							</div>
						<?php endif; ?>
					</form>
				</section>

				<section class="brx-panel" aria-labelledby="brx-connect">
					<h2 id="brx-connect">Connect Raycast to this site</h2>
					<p>Three steps, once per site. Raycast signs in with an application password, so your real password never leaves WordPress.</p>
					<ol class="brx-steps">
						<li>
							<strong>Install the Raycast extension</strong>
							<p>Bricks Builder for Raycast: open pages in the builder, search classes, colors and elements, and manage all your Bricks sites from one place.<br><a href="<?php echo esc_url( PRODUCT_URL ); ?>" target="_blank" rel="noopener">Get the extension <?php echo settings_icon( 'external' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a></p>
						</li>
						<li>
							<strong>Create an application password</strong>
							<p>On your profile, under Application Passwords, add one named "Raycast" and copy it.</p>
							<?php if ( $app_pw_ok ) : ?>
								<p><a class="button" href="<?php echo esc_url( admin_url( 'profile.php#application-passwords-section' ) ); ?>">Open Application Passwords</a></p>
							<?php else : ?>
								<p class="brx-warn">Application passwords aren't available on this site. WordPress needs HTTPS for them (or a local environment), and no security plugin may switch them off.</p>
							<?php endif; ?>
						</li>
						<li>
							<strong>Add the site in Raycast</strong>
							<p>Run Manage Bricks Sites, press ⌘N and enter these, then the application password.</p>
							<div class="brx-copy">
								<span>Site URL</span>
								<code id="brx-url"><?php echo esc_html( home_url() ); ?></code>
								<button type="button" class="button button-small" data-brx-copy="brx-url"><?php echo settings_icon( 'copy' ); // phpcs:ignore WordPress.Security.EscapeOutput ?> Copy</button>
								<span>Username</span>
								<code id="brx-user"><?php echo esc_html( $user->user_login ); ?></code>
								<button type="button" class="button button-small" data-brx-copy="brx-user"><?php echo settings_icon( 'copy' ); // phpcs:ignore WordPress.Security.EscapeOutput ?> Copy</button>
							</div>
							<p class="screen-reader-text" aria-live="polite" id="brx-copied"></p>
						</li>
					</ol>
				</section>
			</div>

			<aside class="brx-side">
				<section class="brx-panel" aria-labelledby="brx-included">
					<h2 id="brx-included">What's included</h2>
					<h3>Free</h3>
					<ul class="brx-list is-free">
						<?php foreach ( $free as $item ) : ?>
							<li><?php echo settings_icon( 'check' ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><?php echo esc_html( $item ); ?></span></li>
						<?php endforeach; ?>
					</ul>
					<h3>Pro <span class="brx-tag"><?php echo $active ? 'Active' : 'From €29/yr'; ?></span></h3>
					<ul class="brx-list is-pro">
						<?php foreach ( $pro as $item ) : ?>
							<li><?php echo settings_icon( $active ? 'check' : 'lock' ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><?php echo esc_html( $item ); ?></span></li>
						<?php endforeach; ?>
					</ul>
				</section>

				<section class="brx-panel" aria-labelledby="brx-about">
					<h2 id="brx-about">Helper plugin</h2>
					<dl class="brx-about">
						<dt>Version</dt>
						<dd><?php echo esc_html( VERSION ); ?></dd>
						<dt>Updates</dt>
						<dd>
							<?php if ( $has_update ) : ?>
								<a href="<?php echo esc_url( admin_url( 'update-core.php' ) ); ?>"><?php echo esc_html( $update['version'] ); ?> available</a>
							<?php elseif ( $update ) : ?>
								Up to date
							<?php else : ?>
								–
							<?php endif; ?>
						</dd>
						<dt>Bricks</dt>
						<dd><?php echo defined( 'BRICKS_VERSION' ) ? esc_html( BRICKS_VERSION ) : 'Not active'; ?></dd>
					</dl>
				</section>
			</aside>
		</div>

		<p class="brx-foot">Made by <a href="<?php echo esc_url( MARTEJ_URL ); ?>" target="_blank" rel="noopener">Martej</a> for people who build with Bricks.</p>
	</div>
	<script>
		document.querySelectorAll('[data-brx-copy]').forEach(function (button) {
			button.addEventListener('click', function () {
				var text = document.getElementById(button.dataset.brxCopy).textContent.trim();
				var done = function () {
					var label = button.lastChild;
					label.textContent = ' Copied';
					document.getElementById('brx-copied').textContent = 'Copied ' + text;
					setTimeout(function () { label.textContent = ' Copy'; }, 1600);
				};
				if (navigator.clipboard && window.isSecureContext) {
					navigator.clipboard.writeText(text).then(done);
				} else {
					var area = document.createElement('textarea');
					area.value = text;
					document.body.appendChild(area);
					area.select();
					document.execCommand('copy');
					area.remove();
					done();
				}
			});
		});
	</script>
	<?php
}
