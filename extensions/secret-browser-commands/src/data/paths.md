# Chrome URLs

chrome://access-code-cast
chrome://accessibility
chrome://actor-overlay
chrome://app-service-internals
chrome://app-settings
chrome://apps
chrome://assistant
chrome://attribution-internals
chrome://autofill-internals
chrome://batch-upload
chrome://blob-internals
chrome://bluetooth-internals
chrome://bookmarks
chrome://bookmarks-side-panel.top-chrome
chrome://browser-switch
chrome://certificate-manager
chrome://chrome
chrome://chrome-signin
chrome://chrome-urls
chrome://comments-side-panel.top-chrome
chrome://compare
chrome://components
chrome://connection-help
chrome://connection-monitoring-detected
chrome://connectors-internals
chrome://crashes
chrome://credits
chrome://customize-chrome-side-panel.top-chrome
chrome://debug-webuis-disabled
chrome://device-log
chrome://dino
chrome://downloads
chrome://extensions
chrome://extensions-internals
chrome://extensions-zero-state
chrome://feedback
chrome://flags
chrome://gcm-internals
chrome://gpu
chrome://histograms
chrome://history
chrome://history-clusters-side-panel.top-chrome
chrome://history-side-panel.top-chrome
chrome://history-sync-optin
chrome://indexeddb-internals
chrome://inspect
chrome://internals
chrome://intro
chrome://managed-user-profile-notice
chrome://management
chrome://media-engagement
chrome://media-internals
chrome://metrics-internals
chrome://native-bookmarks
chrome://net-export
chrome://net-internals
chrome://new-tab-page
chrome://new-tab-page-third-party
chrome://newtab
chrome://newtab-footer
chrome://ntp-tiles-internals
chrome://omnibox-popup.top-chrome
chrome://on-device-translation-internals
chrome://password-manager
chrome://password-manager-internals
chrome://policy
chrome://predictors
chrome://print
chrome://privacy-sandbox-base-dialog
chrome://privacy-sandbox-dialog
chrome://privacy-sandbox-internals
chrome://private-aggregation-internals
chrome://process-internals
chrome://profile-customization
chrome://profile-internals
chrome://profile-picker
chrome://quota-internals
chrome://read-later.top-chrome
chrome://reset-password
chrome://saved-tab-groups-unsupported
chrome://search-engine-choice
chrome://segmentation-internals
chrome://serviceworker-internals
chrome://settings
chrome://shopping-insights-side-panel.top-chrome
chrome://signin-dice-web-intercept.top-chrome
chrome://signin-email-confirmation
chrome://signin-error
chrome://signin-internals
chrome://signout-confirmation
chrome://site-engagement
chrome://skills-manager
chrome://start-page
chrome://suggest-internals
chrome://support-tool
chrome://sync-confirmation
chrome://sync-internals
chrome://system
chrome://tab-group-home
chrome://tab-search.top-chrome
chrome://terms
chrome://topics-internals
chrome://translate-internals
chrome://usb-internals
chrome://version
chrome://view-cert
chrome://watermark
chrome://web-app-internals
chrome://webrtc-internals
chrome://whats-new
chrome-untrusted://compose
chrome-untrusted://data-sharing
chrome-untrusted://ntp-microsoft-auth
chrome-untrusted://print
chrome-untrusted://privacy-sandbox-dialog
chrome-untrusted://read-anything-side-panel.top-chrome

# Internal Debugging Page URLs

chrome://actor-internals
chrome://autofill-ml-internals
chrome://color-pipeline-internals
chrome://commerce-internals
chrome://data-sharing-internals
chrome://discards
chrome://download-internals
chrome://family-link-user-internals
chrome://history-clusters-internals
chrome://infobar-internals
chrome://interstitials
chrome://local-state
chrome://location-internals
chrome://media-router-internals
chrome://memory-internals
chrome://network-errors
chrome://omnibox
chrome://on-device-internals
chrome://optimization-guide-internals
chrome://profile-internals
chrome://safe-browsing
chrome://tab-strip-internals
chrome://traces
chrome://traces-internals
chrome://tracing
chrome://ukm
chrome://user-actions
chrome://user-education-internals
chrome://webrtc-logs
chrome://webui-gallery
chrome://webuijserror

# Command URLs for Debug

The following URLs are for debugging purposes only. Because they crash or hang the renderer, they're not linked directly; you can type them into the address bar if you need them.

chrome://badcastcrash
chrome://inducebrowsercrashforrealz
chrome://inducebrowserdcheckforrealz
chrome://crash
chrome://crash/rust
chrome://crashdump
chrome://kill
chrome://hang
chrome://shorthang
chrome://gpuclean
chrome://gpucrash
chrome://gpuhang
chrome://memory-exhaust
chrome://memory-pressure-critical
chrome://memory-pressure-moderate
chrome://webuijserror
chrome://quit
chrome://restart

From https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/ui/webui/chrome_url_data_manager_browsertest.cc?q=media-engagement&ss=chromium/chromium/src

```cpp
#if !BUILDFLAG(IS_CHROMEOS)
    "chrome://app-service-internals",
#endif
    "chrome://attribution-internals",
    "chrome://autofill-internals",
    "chrome://bookmarks",
    "chrome://bookmarks-side-panel.top-chrome",
    "chrome://comments-side-panel.top-chrome",
    "chrome://chrome-urls",
    "chrome://components",
    "chrome://connection-help",
    "chrome://connection-monitoring-detected",
// TODO(crbug.com/40913109): Re-enable this test
#if !BUILDFLAG(IS_LINUX) && !BUILDFLAG(IS_CHROMEOS)
    "chrome://credits",
#endif
    "chrome://customize-chrome-side-panel.top-chrome",
    "chrome://debug-webuis-disabled",
    "chrome://device-log",
    // TODO(crbug.com/40710256): Test failure due to excessive output.
    // "chrome://discards",
    "chrome://download-internals",
    "chrome://downloads",
    "chrome://extensions",
    "chrome://extensions-internals",
    "chrome://flags",
    "chrome://gcm-internals",
    "chrome://gpu",
    "chrome://histograms",
    "chrome://history",
    "chrome://history-clusters-side-panel.top-chrome",
    "chrome://indexeddb-internals",
    "chrome://inspect",
    "chrome://internals/session-service",
    "chrome://interstitials/ssl",
    "chrome://local-state",
    "chrome://management",
    "chrome://media-engagement",
    "chrome://media-internals",
    "chrome://media-router-internals",
    "chrome://metrics-internals",
    // TODO(crbug.com/40185163): DCHECK failure
    // "chrome://memory-internals",
    "chrome://net-export",
    "chrome://net-internals",
    "chrome://network-errors",
    "chrome://new-tab-page",
    "chrome://new-tab-page-third-party",
    "chrome://newtab",
    "chrome://ntp-tiles-internals",
    "chrome://omnibox",
    "chrome://password-manager",
    "chrome://password-manager-internals",
    "chrome://policy",
    "chrome://predictors",
    "chrome://prefs-internals",
    "chrome://privacy-sandbox-dialog/?debug",
    "chrome://process-internals",
    "chrome://quota-internals",
    "chrome://read-later.top-chrome",
    "chrome://reset-password",
    "chrome://safe-browsing",
    "chrome://saved-tab-groups-unsupported",
    "chrome://search-engine-choice",
    "chrome://serviceworker-internals",
    "chrome://segmentation-internals",
    "chrome://settings",
    "chrome://signin-internals",
    "chrome://site-engagement",
    "chrome://support-tool",
    // TODO(crbug.com/40137561): Navigating to chrome://sync-confirmation and
    // quickly navigating away cause DCHECK failure.
    // "chrome://sync-confirmation",
    "chrome://sync-internals",
    "chrome://system",
    "chrome://tab-search.top-chrome",
    // TODO(crbug.com/40137562): Navigating to chrome://tab-strip and quickly
    // navigating away cause DCHECK failure.
    // "chrome://tab-strip",
    "chrome://terms",
    "chrome://topics-internals",
    "chrome://translate-internals",
    "chrome://ukm",
    "chrome://usb-internals",
    "chrome://user-actions",
    "chrome://user-education-internals",
    "chrome://version",
    "chrome://web-app-internals",
    "chrome://webrtc-internals",
    "chrome://webrtc-logs",
    "chrome://webui-gallery",

#if BUILDFLAG(IS_WIN) || BUILDFLAG(IS_MAC) || BUILDFLAG(IS_LINUX)
    "chrome://whats-new",
#endif

#if BUILDFLAG(GOOGLE_CHROME_BRANDING)
    "chrome://cast-feedback",
#endif

#if BUILDFLAG(IS_ANDROID)
    "chrome://explore-sites-internals",
    "chrome://internals/notifications",
    "chrome://internals/query-tiles",
    "chrome://snippets-internals",
    "chrome://webapks",
#endif

#if BUILDFLAG(IS_CHROMEOS)
    // TODO(crbug.com/40250441): Add CrOS-only WebUI URLs here as TrustedTypes
    // are deployed to more WebUIs.

    "chrome://accessory-update",
    "chrome://account-manager-error",
    "chrome://account-migration-welcome",
    "chrome://add-supervision/",
    "chrome://app-disabled",
    "chrome://camera-app/views/main.html",
    "chrome://bluetooth-pairing",
    "chrome://certificate-manager/",

    // Crashes because message handler is not registered outside of the dialog
    // for confirm password change UI.
    // "chrome://confirm-password-change",

    // TODO(b/300875336): Navigating to chrome://cloud-upload causes an
    // assertion failure because there are no dialog args.
    "chrome://cloud-upload",

    "chrome://connectivity-diagnostics",
    "chrome://connectors-internals",
    "chrome://crashes",
    "chrome://crostini-installer",
    "chrome://crostini-upgrader",
    "chrome://cryptohome",
    "chrome://diagnostics",
    "chrome://drive-internals",
    "chrome://emoji-picker",
    "chrome://family-link-user-internals",
    "chrome://file-manager",
    "chrome://help-app",
    "chrome://linux-proxy-config",
    "chrome://manage-mirrorsync",
    "chrome://multidevice-internals",
    "chrome://multidevice-setup",
    "chrome://nearby",
    "chrome://nearby-internals",
    "chrome://network",
    "chrome://office-fallback/",
    "chrome://os-feedback",
    "chrome-untrusted://os-feedback",
    "chrome://os-settings",
    "chrome://parent-access",
    "chrome://password-change",
    "chrome://personalization",
    "chrome://power",
    "chrome://print-management",
    "chrome-untrusted://projector",
    "chrome://proximity-auth/proximity_auth.html",
    "chrome://scanning",
    "chrome://set-time",
    "chrome://shimless-rma",
    "chrome://shortcut-customization",
    "chrome://slow",
    "chrome://smb-credentials-dialog/",
    "chrome://smb-share-dialog/",
    "chrome://urgent-password-expiry-notification/",
    "chrome://sys-internals",
#endif
#if !BUILDFLAG(IS_CHROMEOS)
    "chrome://apps",
    "chrome://browser-switch",
    "chrome://browser-switch/internals",
    "chrome://profile-picker",
    // Note: Disabled because a DCHECK fires when directly visiting the URL.
    // "chrome://managed-user-profile-notice",
    "chrome://intro",
    "chrome://profile-customization/?debug",
    "chrome://signin-email-confirmation",
#endif
#if !BUILDFLAG(IS_MAC)
    "chrome://sandbox",
#endif  // !BUILDFLAG(IS_MAC)
#if !BUILDFLAG(IS_MAC)
    // TODO(crbug.com/40772380): this test is flaky on mac.
    "chrome://bluetooth-internals",
#endif
#if BUILDFLAG(IS_WIN)
    "chrome://conflicts",
#endif
#if BUILDFLAG(ENABLE_DICE_SUPPORT)
    "chrome://signin-dice-web-intercept.top-chrome/?debug",
// Note: Disabled because a DCHECK fires when directly visiting the URL.
// "chrome://signin-reauth",
#endif
#if BUILDFLAG(IS_CHROMEOS)
// TODO(crbug.com/40250068): Uncomment when TrustedTypes are enabled.
// "chrome://chrome-signin",
#endif
#if BUILDFLAG(ENABLE_DICE_SUPPORT) && !BUILDFLAG(IS_CHROMEOS)
    // TODO(crbug.com/40250068): Uncomment when TrustedTypes are enabled.
    // "chrome://chrome-signin/?reason=5",
    "chrome://signout-confirmation",
#endif
#if BUILDFLAG(IS_LINUX) || BUILDFLAG(IS_CHROMEOS)
    "chrome://webuijserror",
#endif
#if BUILDFLAG(ENABLE_PRINT_PREVIEW)
    "chrome://print",
#endif
};
```
