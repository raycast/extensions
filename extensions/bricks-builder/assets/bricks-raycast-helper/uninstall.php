<?php
/**
 * Deleting the plugin removes what it stored: the license, the cached update info, the scan version,
 * the cached scans and settings page notices, and the daily license check. The license itself isn't
 * deactivated here: the deactivation hook already freed this site's activation.
 * Images marked decorative keep that mark, since it describes the image, not the plugin.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

function bricks_raycast_helper_uninstall_site(): void {
	global $wpdb;

	delete_option( 'bricks_raycast_license' );
	delete_option( 'bricks_raycast_pending_deactivations' );
	delete_option( 'bricks_raycast_scan_version' );
	delete_option( 'bricks_raycast_update_info' );
	wp_clear_scheduled_hook( 'bricks_raycast_license_check' );

	// Cached scans (bricks_raycast_<scan>_<hash>) and notices (bricks_raycast_license_notice_<user>).
	// With a persistent object cache they live there instead and expire within ten minutes.
	foreach ( [ '_transient_bricks_raycast_', '_transient_timeout_bricks_raycast_' ] as $prefix ) {
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( $prefix ) . '%' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
	}
}

if ( is_multisite() ) {
	// The update info is a network option.
	delete_site_option( 'bricks_raycast_update_info' );
	foreach ( get_sites( [ 'fields' => 'ids', 'number' => 0 ] ) as $site_id ) {
		switch_to_blog( (int) $site_id );
		bricks_raycast_helper_uninstall_site();
		restore_current_blog();
	}
} else {
	bricks_raycast_helper_uninstall_site();
}
