import { BrowserCommand } from "../types/types";

export const browserCommands: BrowserCommand[] = [
  {
    id: "about",
    name: "About",
    path: "about",
    description: (preferredBrowser: { title: string }) =>
      `Provides a list of all ${preferredBrowser.title} URLs, including ones for troubleshooting and debugging.`,
  },

  {
    id: "access-code-cast",
    name: "Access Code Cast",
    path: "access-code-cast",
    description: "Provides an interface for casting content using access codes to supported devices.",
  },

  {
    id: "accessibility",
    name: "Accessibility",
    path: "accessibility",
    description:
      "Displays accessibility information for each tab and allows global toggling of accessibility features.",
  },

  {
    id: "app-service-internals",
    name: "App Service Internals",
    path: "app-service-internals",
    description: "Displays debug information for the App Service.",
  },

  {
    id: "app-settings",
    name: "App Settings",
    path: "app-settings",
    description:
      "Provides a settings page for managing Chrome apps and extensions, including advanced configuration options.",
  },

  {
    id: "appcache-internals",
    name: "AppCache Internals",
    path: "appcache-internals",
    description: "Displays Application Cache (AppCache) internal status and debugging information.",
  },

  {
    id: "apps",
    name: "Apps",
    path: "apps",
    description: (preferredBrowser: { title: string }) =>
      `Displays the applications that are installed in ${preferredBrowser.title}.`,
  },

  // Start of newly added URLs from Chromium source
  {
    id: "assistant-optin",
    name: "Assistant Opt-In",
    path: "assistant-optin",
    description: (preferredBrowser: { title: string }) =>
      `Opt-in page for ${preferredBrowser.title}'s built-in virtual assistant features.`,
  },

  {
    id: "attribution-internals",
    name: "Attribution Internals",
    path: "attribution-internals",
    description: "Displays debug information for the Attribution Reporting API, used for ad conversion measurement.",
  },

  {
    id: "autofill-internals",
    name: "Autofill Internals",
    path: "autofill-internals",
    description: "Displays internal logs and debug data for the browser's autofill feature.",
  },

  {
    id: "batch-upload",
    name: "Batch Upload",
    path: "batch-upload",
    description: "Provides an interface for uploading multiple files in a single batch operation.",
  },

  {
    id: "blob-internals",
    name: "Blob Internals",
    path: "blob-internals",
    description: "Displays all Binary Large Object (BLOB) data currently stored by the browser.",
  },

  {
    id: "bluetooth-internals",
    name: "Bluetooth Internals",
    path: "bluetooth-internals",
    description: "Displays detailed information about Bluetooth adapters, connections, and paired devices.",
  },

  {
    id: "bookmarks",
    name: "Bookmarks",
    path: "bookmarks",
    description: "Opens the bookmark manager.",
  },

  {
    id: "bookmarks-side-panel-top-chrome",
    name: "Bookmarks Side Panel Top Chrome",
    path: "bookmarks-side-panel.top-chrome",
    description: "Opens the bookmarks side panel directly in the browser's top chrome UI area.",
  },

  {
    id: "browser-switch",
    name: "Browser Switch",
    path: "browser-switch",
    description: "Provides an interface for switching between different browser profiles or instances.",
  },

  {
    id: "certificate-manager",
    name: "Certificate Manager",
    path: "certificate-manager",
    description: "Manages SSL/TLS certificates, allowing users to view, import, and export them.",
  },

  {
    id: "chrome",
    name: "Chrome",
    path: "chrome",
    description: (preferredBrowser: { title: string }) =>
      `Main internal page for ${preferredBrowser.title} browser information.`,
  },

  {
    id: "chrome-signin",
    name: "Chrome Sign In",
    path: "chrome-signin",
    description: (preferredBrowser: { title: string }) =>
      `Sign-in page for ${preferredBrowser.title} accounts and profiles.`,
  },

  {
    id: "chrome-urls",
    name: "Chrome URLs",
    path: "chrome-urls",
    description: (preferredBrowser: { title: string }) =>
      `Lists all internal ${preferredBrowser.title} URLs (similar to about page but with a different format).`,
  },

  {
    id: "commerce-internals",
    name: "Commerce Internals",
    path: "commerce-internals",
    isInternalDebugging: true,
    description: "Displays debug information for commerce-related features, such as price tracking and shopping.",
  },

  {
    id: "components",
    name: "Components",
    path: "components",
    description: (preferredBrowser: { title: string }) =>
      `Lists all components installed in ${preferredBrowser.title} and allows you to check for updates.`,
  },

  {
    id: "connection-help",
    name: "Connection Help",
    path: "connection-help",
    description: "Provides troubleshooting information for network connection issues.",
  },

  {
    id: "connection-monitoring-detected",
    name: "Connection Monitoring Detected",
    path: "connection-monitoring-detected",
    description: "Shows a warning page when the browser detects that your connection is being monitored or modified.",
  },

  {
    id: "connectors-internals",
    name: "Connectors Internals",
    path: "connectors-internals",
    description: "Debug information for browser connectors and integrations.",
  },

  {
    id: "conversion-internals",
    name: "Conversion Internals",
    path: "conversion-internals",
    description: "Displays information about conversion tracking and measurement.",
  },

  {
    id: "crashes",
    name: "Crashes",
    path: "crashes",
    description: (preferredBrowser: { title: string }) =>
      `Displays information about ${preferredBrowser.title} crashes if crash reporting is enabled.`,
  },

  {
    id: "credits",
    name: "Credits",
    path: "credits",
    description: (preferredBrowser: { title: string }) =>
      `Displays the credits for all open source software used in ${preferredBrowser.title}.`,
  },

  {
    id: "customize-chrome-side-panel-top-chrome",
    name: "Customize Chrome Side Panel Top Chrome",
    path: "customize-chrome-side-panel.top-chrome",
    description: (preferredBrowser: { title: string }) =>
      `Opens the customization interface for ${preferredBrowser.title}'s side panel in the top chrome UI.`,
  },

  {
    id: "data-sharing-internals",
    name: "Data Sharing Internals",
    path: "data-sharing-internals",
    isInternalDebugging: true,
    description: "Debug information for data sharing features and synchronization.",
  },

  {
    id: "debug-webuis-disabled",
    name: "Debug Webuis Disabled",
    path: "debug-webuis-disabled",
    description: "Displays information about debug UI pages that are currently disabled.",
  },

  {
    id: "device-log",
    name: "Device Log",
    path: "device-log",
    description: "Displays device-related logs.",
  },

  {
    id: "devices",
    name: "Devices",
    path: "devices",
    description: (preferredBrowser: { title: string }) =>
      `Lists physical and virtual devices connected to ${preferredBrowser.title}.`,
  },

  {
    id: "dino",
    name: "Dino Game",
    path: "dino",
    description: "Play the hidden dinosaur game (usually shown when offline).",
  },

  {
    id: "discards",
    name: "Discards",
    path: "discards",
    isInternalDebugging: true,
    description: "Lists tabs that have been discarded to save memory, and allows manual discarding.",
  },

  {
    id: "download-internals",
    name: "Download Internals",
    path: "download-internals",
    isInternalDebugging: true,
    description: "View information about active downloads.",
  },

  {
    id: "downloads",
    name: "Downloads",
    path: "downloads",
    description: "Displays the list of downloaded files.",
  },

  {
    id: "extensions",
    name: "Extensions",
    path: "extensions",
    description: "Lists all installed extensions and allows you to manage them.",
  },

  {
    id: "extensions-internals",
    name: "Extensions Internals",
    path: "extensions-internals",
    description: "Advanced debugging interface for browser extensions, showing detailed technical information.",
  },

  {
    id: "family-link-user-internals",
    name: "Family Link User Internals",
    path: "family-link-user-internals",
    isInternalDebugging: true,
    description: "Debug information for Family Link user accounts and restrictions.",
  },

  {
    id: "feedback",
    name: "Feedback",
    path: "feedback",
    description: (preferredBrowser: { title: string }) =>
      `Submit feedback and bug reports to ${preferredBrowser.title} developers.`,
  },

  {
    id: "flags",
    name: "Flags",
    path: "flags",
    description: "Access experimental browser features. Be careful, these can break things!",
  },

  {
    id: "gcm-internals",
    name: "GCM Internals",
    path: "gcm-internals",
    description: "Google Cloud Messaging internal information.",
  },

  {
    id: "gpu",
    name: "GPU",
    path: "gpu",
    description: "Shows detailed information about the GPU hardware, drivers, and feature status.",
  },

  {
    id: "help",
    name: "Help",
    path: "help",
    description: (preferredBrowser: { title: string }) =>
      `Displays ${preferredBrowser.title} version information and about page.`,
  },

  {
    id: "histograms",
    name: "Histograms",
    path: "histograms",
    description: (preferredBrowser: { title: string }) => `View histograms collected by ${preferredBrowser.title}.`,
  },

  {
    id: "history",
    name: "History",
    path: "history",
    description: "Opens the browser history page.",
  },

  {
    id: "history-clusters-internals",
    name: "History Clusters Internals",
    path: "history-clusters-internals",
    isInternalDebugging: true,
    description: "Debug information for the history clustering feature that groups related pages.",
  },

  {
    id: "history-clusters-side-panel-top-chrome",
    name: "History Clusters Side Panel Top Chrome",
    path: "history-clusters-side-panel.top-chrome",
    description: "Opens the browsing history organized in clusters within the side panel of the browser UI.",
  },

  {
    id: "history-side-panel-top-chrome",
    name: "History Side Panel Top Chrome",
    path: "history-side-panel.top-chrome",
    description: "Access browsing history directly from the browser's top chrome UI area.",
  },

  {
    id: "history-sync-optin",
    name: "History Sync Opt-in",
    path: "history-sync-optin",
    description: "Page to opt into history synchronization across devices.",
  },

  {
    id: "indexeddb-internals",
    name: "IndexedDB Internals",
    path: "indexeddb-internals",
    description: "Displays detailed information about IndexedDB databases and their contents.",
  },

  {
    id: "inspect",
    name: "Inspect",
    path: "inspect",
    description: "Inspect elements, network activity, and more for web pages and extensions.",
  },

  {
    id: "internals",
    name: "Internals",
    path: "internals",
    description: "Gateway page to various internal debugging tools and information.",
  },

  {
    id: "internals-gpu",
    name: "Internals GPU",
    path: "internals/gpu",
    description: "Detailed graphics processing unit information.",
  },

  {
    id: "internals-media",
    name: "Internals Media",
    path: "internals/media",
    description: "View media playback information and debug media issues.",
  },

  {
    id: "internals-query-tiles",
    name: "Internals Query Tiles",
    path: "internals/query-tiles",
    description: "Debug information for query tiles.",
  },

  {
    id: "internals-session-service",
    name: "Internals Session Service",
    path: "internals/session-service",
    description: "Provides diagnostic information about the browser's session service.",
  },

  {
    id: "interstitials",
    name: "Interstitials",
    path: "interstitials",
    isInternalDebugging: true,
    description: "Debug interface for various interstitial pages shown by the browser.",
  },

  {
    id: "interstitials-ssl",
    name: "Interstitials SSL",
    path: "interstitials/ssl",
    description: "Shows examples of SSL certificate warning pages for testing and debugging purposes.",
  },

  {
    id: "intro",
    name: "Intro",
    path: "intro",
    description: (preferredBrowser: { title: string }) =>
      `Introduction and onboarding experience for new ${preferredBrowser.title} users.`,
  },

  {
    id: "invalidations",
    name: "Invalidations",
    path: "invalidations",
    description: "View invalidation debug information.",
  },

  {
    id: "local-state",
    name: "Local State",
    path: "local-state",
    isInternalDebugging: true,
    description: (preferredBrowser: { title: string }) =>
      `Shows a JSON representation of ${preferredBrowser.title}'s local state file.`,
  },

  {
    id: "location-internals",
    name: "Location Internals",
    path: "location-internals",
    isInternalDebugging: true,
    description: "Debug information for geolocation services and permissions.",
  },

  {
    id: "managed-user-profile-notice",
    name: "Managed User Profile Notice",
    path: "managed-user-profile-notice",
    description: "Notification page for users with managed/supervised profiles.",
  },

  {
    id: "management",
    name: "Management",
    path: "management",
    description: "Displays policies set by enterprise administrators (if any).",
  },

  {
    id: "media-engagement",
    name: "Media Engagement",
    path: "media-engagement",
    description: "View engagement scores for media playback.",
  },

  {
    id: "media-internals",
    name: "Media Internals",
    path: "media-internals",
    description: "Detailed information about media playback and audio/video components.",
  },

  {
    id: "media-router-internals",
    name: "Media Router Internals",
    path: "media-router-internals",
    isInternalDebugging: true,
    description: "Debug information for media casting and routing features (like Chromecast functionality).",
  },

  {
    id: "memory-internals",
    name: "Memory Internals",
    path: "memory-internals",
    isInternalDebugging: true,
    description: "Detailed memory usage information.",
  },

  {
    id: "metrics-internals",
    name: "Metrics Internals",
    path: "metrics-internals",
    description: (preferredBrowser: { title: string }) =>
      `Shows internal metrics and usage statistics collected by ${preferredBrowser.title}.`,
  },

  {
    id: "net-export",
    name: "Net Export",
    path: "net-export",
    description: "Capture network logs for debugging network issues.",
  },

  {
    id: "net-internals",
    name: "Net Internals",
    path: "net-internals",
    description: "View detailed network information, including events, DNS, Sockets, etc.",
  },

  {
    id: "network-errors",
    name: "Network Errors",
    path: "network-errors",
    isInternalDebugging: true,
    description: "View network errors and debugging information.",
  },

  {
    id: "new-tab-page",
    name: "New Tab Page",
    path: "new-tab-page",
    description: "Opens the customized new tab page (may differ from chrome://newtab in some browsers).",
  },

  {
    id: "new-tab-page-third-party",
    name: "New Tab Page Third Party",
    path: "new-tab-page-third-party",
    description: "Displays the new tab page with third-party content modules.",
  },

  {
    id: "newtab",
    name: "New Tab",
    path: "newtab",
    description: "Opens a new tab page.",
  },

  {
    id: "ntp-tiles-internals",
    name: "NTP Tiles Internals",
    path: "ntp-tiles-internals",
    description:
      "Debug information for the tiles shown on the New Tab Page, including suggestions and most visited sites.",
  },

  {
    id: "omnibox",
    name: "Omnibox",
    path: "omnibox",
    isInternalDebugging: true,
    description: "Debug and test the Omnibox (address bar) functionality.",
  },

  {
    id: "omnibox-popup-top-chrome",
    name: "Omnibox Popup Top Chrome",
    path: "omnibox-popup.top-chrome",
    description: "Debug view of the omnibox (address bar) popup UI in the top chrome area.",
  },

  {
    id: "on-device-internals",
    name: "On Device Internals",
    path: "on-device-internals",
    isInternalDebugging: true,
    description: "Debug information for on-device features and machine learning models.",
  },

  {
    id: "on-device-translation-internals",
    name: "On-Device Translation Internals",
    path: "on-device-translation-internals",
    description: "Debug information for the browser's on-device translation feature.",
  },

  {
    id: "optimization-guide-internals",
    name: "Optimization Guide Internals",
    path: "optimization-guide-internals",
    isInternalDebugging: true,
    description: "Debug interface for the optimization guide that provides hints for browser optimizations.",
  },

  {
    id: "password-manager",
    name: "Password Manager",
    path: "password-manager",
    description: (preferredBrowser: { title: string }) =>
      `Interface for viewing and managing passwords saved in ${preferredBrowser.title}.`,
  },

  {
    id: "password-manager-internals",
    name: "Password Manager Internals",
    path: "password-manager-internals",
    description: "Debug information for the password manager.",
  },

  {
    id: "policy",
    name: "Policy",
    path: "policy",
    description: "Displays all policies currently in effect.",
  },

  {
    id: "predictors",
    name: "Predictors",
    path: "predictors",
    description: (preferredBrowser: { title: string }) =>
      `View information about ${preferredBrowser.title}'s network and resource predictors.`,
  },

  {
    id: "prefs-internals",
    name: "Prefs Internals",
    path: "prefs-internals",
    description: (preferredBrowser: { title: string }) =>
      `Shows all internal preferences and settings for ${preferredBrowser.title}.`,
  },

  {
    id: "print",
    name: "Print",
    path: "print",
    description: "Opens the print preview dialog (usually requires a page to be active).",
  },

  {
    id: "privacy-sandbox-dialog",
    name: "Privacy Sandbox Dialog",
    path: "privacy-sandbox-dialog",
    description: "Interface for Privacy Sandbox settings and controls.",
  },

  {
    id: "privacy-sandbox-dialog-debug",
    name: "Privacy Sandbox Dialog Debug",
    path: "privacy-sandbox-dialog/?debug",
    description: "Debugging interface for the Privacy Sandbox dialog, showing technical details and state information.",
  },

  {
    id: "privacy-sandbox-internals",
    name: "Privacy Sandbox Internals",
    path: "privacy-sandbox-internals",
    description: "Debug information for the Privacy Sandbox features and APIs.",
  },

  {
    id: "private-aggregation-internals",
    name: "Private Aggregation Internals",
    path: "private-aggregation-internals",
    description: "Debug information for the Private Aggregation API, part of the Privacy Sandbox.",
  },

  {
    id: "process-internals",
    name: "Process Internals",
    path: "process-internals",
    description: "View information about site isolation and process models.",
  },

  {
    id: "profile-customization",
    name: "Profile Customization",
    path: "profile-customization",
    description: "Interface for customizing browser profile appearance and settings.",
  },

  {
    id: "profile-internals",
    name: "Profile Internals",
    path: "profile-internals",
    isInternalDebugging: true,
    description: "Detailed debug information about the browser's profile and user data.",
  },

  {
    id: "profile-picker",
    name: "Profile Picker",
    path: "profile-picker",
    description: "Interface for selecting and managing different browser profiles.",
  },

  {
    id: "quota-internals",
    name: "Quota Internals",
    path: "quota-internals",
    description: "View information about disk space quotas for websites.",
  },

  {
    id: "read-later-top-chrome",
    name: "Read Later Top Chrome",
    path: "read-later.top-chrome",
    description: "Opens the Read Later feature directly in the browser's top chrome UI area.",
  },

  {
    id: "reset-password",
    name: "Reset Password",
    path: "reset-password",
    description: (preferredBrowser: { title: string }) =>
      `Interface for resetting passwords for ${preferredBrowser.title} accounts.`,
  },

  {
    id: "safe-browsing",
    name: "Safe Browsing",
    path: "safe-browsing",
    isInternalDebugging: true,
    description: "View Safe Browsing information and debug data.",
  },

  {
    id: "saved-tab-groups-unsupported",
    name: "Saved Tab Groups Unsupported",
    path: "saved-tab-groups-unsupported",
    description: "Shows information page when tab groups feature is unavailable or not supported.",
  },

  {
    id: "search-engine-choice",
    name: "Search Engine Choice",
    path: "search-engine-choice",
    description: "Interface for selecting and managing your default search engine.",
  },

  {
    id: "segmentation-internals",
    name: "Segmentation Internals",
    path: "segmentation-internals",
    description: "Debug information for Chrome's user segmentation system used for targeted features.",
  },

  {
    id: "serviceworker-internals",
    name: "ServiceWorker Internals",
    path: "serviceworker-internals",
    description: "View information about Service Workers and manage them.",
  },

  {
    id: "settings",
    name: "Settings",
    path: "settings",
    description: (preferredBrowser: { title: string }) => `Opens the ${preferredBrowser.title} settings page.`,
  },

  {
    id: "shopping-insights-side-panel-top-chrome",
    name: "Shopping Insights Side Panel Top Chrome",
    path: "shopping-insights-side-panel.top-chrome",
    description: "Shopping comparison and price tracking tools in the browser's side panel.",
  },

  {
    id: "signin-dice-web-intercept-top-chrome",
    name: "Sign-in Dice Web Intercept Top Chrome",
    path: "signin-dice-web-intercept.top-chrome",
    description: "Sign-in interception dialog in the browser's top chrome UI area.",
  },

  {
    id: "signin-email-confirmation",
    name: "Sign-in Email Confirmation",
    path: "signin-email-confirmation",
    description: "Email confirmation page for browser account sign-in process.",
  },

  {
    id: "signin-error",
    name: "Sign-in Error",
    path: "signin-error",
    description: "Error page displayed when sign-in to browser accounts fails.",
  },

  {
    id: "signin-internals",
    name: "Signin Internals",
    path: "signin-internals",
    description: (preferredBrowser: { title: string }) =>
      `View information about ${preferredBrowser.title} sign-in status and accounts.`,
  },

  {
    id: "signout-confirmation",
    name: "Sign-out Confirmation",
    path: "signout-confirmation",
    description: "Confirmation page when signing out of browser accounts.",
  },

  {
    id: "site-engagement",
    name: "Site Engagement",
    path: "site-engagement",
    description: "View engagement scores for websites you visit.",
  },

  {
    id: "suggest-internals",
    name: "Suggest Internals",
    path: "suggest-internals",
    description: "Debug information for the browser's suggestion systems (search, URL, etc.).",
  },

  {
    id: "suggestions",
    name: "Suggestions",
    path: "suggestions",
    description: "Content suggestions for the New Tab Page.",
  },

  {
    id: "support-tool",
    name: "Support Tool",
    path: "support-tool",
    description: (preferredBrowser: { title: string }) =>
      `Troubleshooting and diagnostic tool for ${preferredBrowser.title} problems.`,
  },

  {
    id: "sync-confirmation",
    name: "Sync Confirmation",
    path: "sync-confirmation",
    description: "Confirmation page for enabling browser data synchronization.",
  },

  {
    id: "sync-internals",
    name: "Sync Internals",
    path: "sync-internals",
    description: (preferredBrowser: { title: string }) =>
      `View detailed information about ${preferredBrowser.title} Sync.`,
  },

  {
    id: "system",
    name: "System",
    path: "system",
    description: (preferredBrowser: { title: string }) =>
      `Provides system information relevant to ${preferredBrowser.title}.`,
  },

  {
    id: "tab-search-top-chrome",
    name: "Tab Search Top Chrome",
    path: "tab-search.top-chrome",
    description: "Opens the tab search interface directly in the browser's top chrome UI area.",
  },

  {
    id: "terms",
    name: "Terms",
    path: "terms",
    description: (preferredBrowser: { title: string }) => `Displays the ${preferredBrowser.title} Terms of Service.`,
  },

  {
    id: "topics-internals",
    name: "Topics Internals",
    path: "topics-internals",
    description: "Debug information for the Topics API, part of the Privacy Sandbox for interest-based advertising.",
  },

  {
    id: "traces",
    name: "Traces",
    path: "traces",
    isInternalDebugging: true,
    description: "Interface for viewing and analyzing browser performance traces.",
  },

  {
    id: "traces-internals",
    name: "Traces Internals",
    path: "traces-internals",
    isInternalDebugging: true,
    description: "Detailed debug information about browser tracing functionality.",
  },

  {
    id: "tracing",
    name: "Tracing",
    path: "tracing",
    description: (preferredBrowser: { title: string }) =>
      `Record performance traces for debugging ${preferredBrowser.title} performance issues.`,
    isInternalDebugging: true,
  },

  {
    id: "translate-internals",
    name: "Translate Internals",
    path: "translate-internals",
    description: (preferredBrowser: { title: string }) =>
      `Displays information about ${preferredBrowser.title}'s translation feature.`,
  },

  {
    id: "ukm",
    name: "UKM",
    path: "ukm",
    isInternalDebugging: true,
    description: "Debug information for the Unified Keyed Metrics system that collects browser usage data.",
  },

  {
    id: "usb-internals",
    name: "USB Internals",
    path: "usb-internals",
    description: "Displays information about connected USB devices and their properties.",
  },

  {
    id: "user-actions",
    name: "User Actions",
    path: "user-actions",
    isInternalDebugging: true,
    description: "Displays user action metrics and debugging information for browser interactions.",
  },

  {
    id: "user-education-internals",
    name: "User Education Internals",
    path: "user-education-internals",
    isInternalDebugging: true,
    description: "Debug information for the browser's user education features like tutorials and tooltips.",
  },

  {
    id: "version",
    name: "Version",
    path: "version",
    description: (preferredBrowser: { title: string }) =>
      `Displays ${preferredBrowser.title} version information and links to copy details.`,
  },

  {
    id: "view-cert",
    name: "View Certificate",
    path: "view-cert",
    description: "Detailed view of SSL/TLS certificates for websites.",
  },

  {
    id: "web-app-internals",
    name: "Web App Internals",
    path: "web-app-internals",
    description: (preferredBrowser: { title: string }) =>
      `Displays debug information for Progressive Web Apps (PWAs) installed in ${preferredBrowser.title}.`,
  },

  {
    id: "webrtc-logs",
    name: "WebRTC Logs",
    path: "webrtc-logs",
    isInternalDebugging: true,
    description: "Displays WebRTC debug logs and connection information.",
  },

  {
    id: "webui-gallery",
    name: "WebUI Gallery",
    path: "webui-gallery",
    isInternalDebugging: true,
    description: (preferredBrowser: { title: string }) =>
      `Gallery of ${preferredBrowser.title}'s UI components and design system elements.`,
  },

  {
    id: "webuijserror",
    name: "WebUI JavaScript Error",
    path: "webuijserror",
    isInternalDebugging: true,
    description: "Debug interface for WebUI JavaScript errors and diagnostics.",
  },

  {
    id: "whats-new",
    name: "What's New",
    path: "whats-new",
    description: (preferredBrowser: { title: string }) =>
      `Displays a page highlighting new features in ${preferredBrowser.title}.`,
  },
];

export const URL_KEY = "secretBrowserCommands.allPaths";
