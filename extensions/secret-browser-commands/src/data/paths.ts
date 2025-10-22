import { BrowserCommand } from "../types/types";

// Browser compatibility constants
const ALL_CHROMIUM = ["chrome", "edge", "brave", "arc", "vivaldi", "opera", "comet", "dia"];
const BASIC_ONLY = ["chrome", "edge", "brave", "arc", "vivaldi", "opera", "comet", "dia", "atlas"];

export const browserCommands: BrowserCommand[] = [
  {
    id: "about",
    name: "About",
    path: "about",
    description: (preferredBrowser: { title: string }) =>
      `Provides a list of all ${preferredBrowser.title} URLs, including ones for troubleshooting and debugging.`,
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "access-code-cast",
    name: "Access Code Cast",
    path: "access-code-cast",
    description: "Provides an interface for casting content using access codes to supported devices.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "accessibility",
    name: "Accessibility",
    path: "accessibility",
    description:
      "Displays accessibility information for each tab and allows global toggling of accessibility features.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "actor-internals",
    name: "Actor Internals",
    path: "actor-internals",
    isInternalDebugging: true,
    description: "Debug information for the actor component system.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "actor-overlay",
    name: "Actor Overlay",
    path: "actor-overlay",
    description: "Displays the actor overlay interface for debugging actor-based features.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "app-service-internals",
    name: "App Service Internals",
    path: "app-service-internals",
    description: "Displays debug information for the App Service.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "app-settings",
    name: "App Settings",
    path: "app-settings",
    description:
      "Provides a settings page for managing Chrome apps and extensions, including advanced configuration options.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "appcache-internals",
    name: "AppCache Internals",
    path: "appcache-internals",
    description: "Displays Application Cache (AppCache) internal status and debugging information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "apps",
    name: "Apps",
    path: "apps",
    description: (preferredBrowser: { title: string }) =>
      `Displays the applications that are installed in ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "assistant",
    name: "Assistant",
    path: "assistant",
    description: (preferredBrowser: { title: string }) =>
      `Interface for ${preferredBrowser.title}'s built-in virtual assistant features.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  // Start of newly added URLs from Chromium source
  {
    id: "assistant-optin",
    name: "Assistant Opt-In",
    path: "assistant-optin",
    description: (preferredBrowser: { title: string }) =>
      `Opt-in page for ${preferredBrowser.title}'s built-in virtual assistant features.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "attribution-internals",
    name: "Attribution Internals",
    path: "attribution-internals",
    description: "Displays debug information for the Attribution Reporting API, used for ad conversion measurement.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "autofill-internals",
    name: "Autofill Internals",
    path: "autofill-internals",
    description: "Displays internal logs and debug data for the browser's autofill feature.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "autofill-ml-internals",
    name: "Autofill ML Internals",
    path: "autofill-ml-internals",
    isInternalDebugging: true,
    description: "Debug information for machine learning features used in autofill predictions.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "batch-upload",
    name: "Batch Upload",
    path: "batch-upload",
    description: "Provides an interface for uploading multiple files in a single batch operation.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "blob-internals",
    name: "Blob Internals",
    path: "blob-internals",
    description: "Displays all Binary Large Object (BLOB) data currently stored by the browser.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "bluetooth-internals",
    name: "Bluetooth Internals",
    path: "bluetooth-internals",
    description: "Displays detailed information about Bluetooth adapters, connections, and paired devices.",
    supportedBrowsers: ALL_CHROMIUM,
    excludedPlatforms: ["mac"],
  },

  {
    id: "bookmarks",
    name: "Bookmarks",
    path: "bookmarks",
    description: "Opens the bookmark manager.",
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "bookmarks-side-panel-top-chrome",
    name: "Bookmarks Side Panel Top Chrome",
    path: "bookmarks-side-panel.top-chrome",
    description: "Opens the bookmarks side panel directly in the browser's top chrome UI area.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "browser-switch",
    name: "Browser Switch",
    path: "browser-switch",
    description: "Provides an interface for switching between different browser profiles or instances.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "certificate-manager",
    name: "Certificate Manager",
    path: "certificate-manager",
    description: "Manages SSL/TLS certificates, allowing users to view, import, and export them.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "chrome",
    name: "Chrome",
    path: "chrome",
    description: (preferredBrowser: { title: string }) =>
      `Main internal page for ${preferredBrowser.title} browser information.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "chrome-signin",
    name: "Chrome Sign In",
    path: "chrome-signin",
    description: (preferredBrowser: { title: string }) =>
      `Sign-in page for ${preferredBrowser.title} accounts and profiles.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "chrome-urls",
    name: "Chrome URLs",
    path: "chrome-urls",
    description: (preferredBrowser: { title: string }) =>
      `Lists all internal ${preferredBrowser.title} URLs (similar to about page but with a different format).`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "color-pipeline-internals",
    name: "Color Pipeline Internals",
    path: "color-pipeline-internals",
    isInternalDebugging: true,
    description: "Debug information for the browser's color pipeline and color management system.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "comments-side-panel-top-chrome",
    name: "Comments Side Panel Top Chrome",
    path: "comments-side-panel.top-chrome",
    description: "Opens the comments side panel directly in the browser's top chrome UI area.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "compare",
    name: "Compare",
    path: "compare",
    description: "Interface for comparing products, prices, or other items.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "commerce-internals",
    name: "Commerce Internals",
    path: "commerce-internals",
    isInternalDebugging: true,
    description: "Displays debug information for commerce-related features, such as price tracking and shopping.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "components",
    name: "Components",
    path: "components",
    description: (preferredBrowser: { title: string }) =>
      `Lists all components installed in ${preferredBrowser.title} and allows you to check for updates.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "connection-help",
    name: "Connection Help",
    path: "connection-help",
    description: "Provides troubleshooting information for network connection issues.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "connection-monitoring-detected",
    name: "Connection Monitoring Detected",
    path: "connection-monitoring-detected",
    description: "Shows a warning page when the browser detects that your connection is being monitored or modified.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "connectors-internals",
    name: "Connectors Internals",
    path: "connectors-internals",
    description: "Debug information for browser connectors and integrations.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "conflicts",
    name: "Conflicts",
    path: "conflicts",
    description: "Displays information about software conflicts that may affect browser stability.",
    supportedBrowsers: ALL_CHROMIUM,
    platforms: ["windows"],
  },

  {
    id: "conversion-internals",
    name: "Conversion Internals",
    path: "conversion-internals",
    description: "Displays information about conversion tracking and measurement.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "crashes",
    name: "Crashes",
    path: "crashes",
    description: (preferredBrowser: { title: string }) =>
      `Displays information about ${preferredBrowser.title} crashes if crash reporting is enabled.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "credits",
    name: "Credits",
    path: "credits",
    description: (preferredBrowser: { title: string }) =>
      `Displays the credits for all open source software used in ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "customize-chrome-side-panel-top-chrome",
    name: "Customize Chrome Side Panel Top Chrome",
    path: "customize-chrome-side-panel.top-chrome",
    description: (preferredBrowser: { title: string }) =>
      `Opens the customization interface for ${preferredBrowser.title}'s side panel in the top chrome UI.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "data-sharing-internals",
    name: "Data Sharing Internals",
    path: "data-sharing-internals",
    isInternalDebugging: true,
    description: "Debug information for data sharing features and synchronization.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "debug-webuis-disabled",
    name: "Debug Webuis Disabled",
    path: "debug-webuis-disabled",
    description: "Displays information about debug UI pages that are currently disabled.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "device-log",
    name: "Device Log",
    path: "device-log",
    description: "Displays device-related logs.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "devices",
    name: "Devices",
    path: "devices",
    description: (preferredBrowser: { title: string }) =>
      `Lists physical and virtual devices connected to ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "dino",
    name: "Dino Game",
    path: "dino",
    description: "Play the hidden dinosaur game (usually shown when offline).",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "discards",
    name: "Discards",
    path: "discards",
    isInternalDebugging: true,
    description: "Lists tabs that have been discarded to save memory, and allows manual discarding.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "download-internals",
    name: "Download Internals",
    path: "download-internals",
    isInternalDebugging: true,
    description: "View information about active downloads.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "downloads",
    name: "Downloads",
    path: "downloads",
    description: "Displays the list of downloaded files.",
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "extensions",
    name: "Extensions",
    path: "extensions",
    description: "Lists all installed extensions and allows you to manage them.",
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "extensions-internals",
    name: "Extensions Internals",
    path: "extensions-internals",
    description: "Advanced debugging interface for browser extensions, showing detailed technical information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "extensions-zero-state",
    name: "Extensions Zero State",
    path: "extensions-zero-state",
    description: "Displays the extensions page in its initial/empty state when no extensions are installed.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "family-link-user-internals",
    name: "Family Link User Internals",
    path: "family-link-user-internals",
    isInternalDebugging: true,
    description: "Debug information for Family Link user accounts and restrictions.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "feedback",
    name: "Feedback",
    path: "feedback",
    description: (preferredBrowser: { title: string }) =>
      `Submit feedback and bug reports to ${preferredBrowser.title} developers.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "flags",
    name: "Flags",
    path: "flags",
    description: "Access experimental browser features. Be careful, these can break things!",
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "gcm-internals",
    name: "GCM Internals",
    path: "gcm-internals",
    description: "Google Cloud Messaging internal information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "gpu",
    name: "GPU",
    path: "gpu",
    description: "Shows detailed information about the GPU hardware, drivers, and feature status.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "help",
    name: "Help",
    path: "help",
    description: (preferredBrowser: { title: string }) =>
      `Displays ${preferredBrowser.title} version information and about page.`,
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "histograms",
    name: "Histograms",
    path: "histograms",
    description: (preferredBrowser: { title: string }) => `View histograms collected by ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "history",
    name: "History",
    path: "history",
    description: "Opens the browser history page.",
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "history-clusters-internals",
    name: "History Clusters Internals",
    path: "history-clusters-internals",
    isInternalDebugging: true,
    description: "Debug information for the history clustering feature that groups related pages.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "history-clusters-side-panel-top-chrome",
    name: "History Clusters Side Panel Top Chrome",
    path: "history-clusters-side-panel.top-chrome",
    description: "Opens the browsing history organized in clusters within the side panel of the browser UI.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "history-side-panel-top-chrome",
    name: "History Side Panel Top Chrome",
    path: "history-side-panel.top-chrome",
    description: "Access browsing history directly from the browser's top chrome UI area.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "history-sync-optin",
    name: "History Sync Opt-in",
    path: "history-sync-optin",
    description: "Page to opt into history synchronization across devices.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "indexeddb-internals",
    name: "IndexedDB Internals",
    path: "indexeddb-internals",
    description: "Displays detailed information about IndexedDB databases and their contents.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "infobar-internals",
    name: "Infobar Internals",
    path: "infobar-internals",
    isInternalDebugging: true,
    description: "Debug information for browser infobars (notification bars at the top of pages).",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "inspect",
    name: "Inspect",
    path: "inspect",
    description: "Inspect elements, network activity, and more for web pages and extensions.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "internals",
    name: "Internals",
    path: "internals",
    description: "Gateway page to various internal debugging tools and information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "internals-gpu",
    name: "Internals GPU",
    path: "internals/gpu",
    description: "Detailed graphics processing unit information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "internals-media",
    name: "Internals Media",
    path: "internals/media",
    description: "View media playback information and debug media issues.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "internals-query-tiles",
    name: "Internals Query Tiles",
    path: "internals/query-tiles",
    description: "Debug information for query tiles.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "internals-session-service",
    name: "Internals Session Service",
    path: "internals/session-service",
    description: "Provides diagnostic information about the browser's session service.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "interstitials",
    name: "Interstitials",
    path: "interstitials",
    isInternalDebugging: true,
    description: "Debug interface for various interstitial pages shown by the browser.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "interstitials-ssl",
    name: "Interstitials SSL",
    path: "interstitials/ssl",
    description: "Shows examples of SSL certificate warning pages for testing and debugging purposes.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "intro",
    name: "Intro",
    path: "intro",
    description: (preferredBrowser: { title: string }) =>
      `Introduction and onboarding experience for new ${preferredBrowser.title} users.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "invalidations",
    name: "Invalidations",
    path: "invalidations",
    description: "View invalidation debug information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "local-state",
    name: "Local State",
    path: "local-state",
    isInternalDebugging: true,
    description: (preferredBrowser: { title: string }) =>
      `Shows a JSON representation of ${preferredBrowser.title}'s local state file.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "location-internals",
    name: "Location Internals",
    path: "location-internals",
    isInternalDebugging: true,
    description: "Debug information for geolocation services and permissions.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "managed-user-profile-notice",
    name: "Managed User Profile Notice",
    path: "managed-user-profile-notice",
    description: "Notification page for users with managed/supervised profiles.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "management",
    name: "Management",
    path: "management",
    description: "Displays policies set by enterprise administrators (if any).",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "media-engagement",
    name: "Media Engagement",
    path: "media-engagement",
    description: "View engagement scores for media playback.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "media-internals",
    name: "Media Internals",
    path: "media-internals",
    description: "Detailed information about media playback and audio/video components.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "media-router-internals",
    name: "Media Router Internals",
    path: "media-router-internals",
    isInternalDebugging: true,
    description: "Debug information for media casting and routing features (like Chromecast functionality).",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "memory-internals",
    name: "Memory Internals",
    path: "memory-internals",
    isInternalDebugging: true,
    description: "Detailed memory usage information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "metrics-internals",
    name: "Metrics Internals",
    path: "metrics-internals",
    description: (preferredBrowser: { title: string }) =>
      `Shows internal metrics and usage statistics collected by ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "net-export",
    name: "Net Export",
    path: "net-export",
    description: "Capture network logs for debugging network issues.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "net-internals",
    name: "Net Internals",
    path: "net-internals",
    description: "View detailed network information, including events, DNS, Sockets, etc.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "network-errors",
    name: "Network Errors",
    path: "network-errors",
    isInternalDebugging: true,
    description: "View network errors and debugging information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "new-tab-page",
    name: "New Tab Page",
    path: "new-tab-page",
    description: "Opens the customized new tab page (may differ from chrome://newtab in some browsers).",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "new-tab-page-third-party",
    name: "New Tab Page Third Party",
    path: "new-tab-page-third-party",
    description: "Displays the new tab page with third-party content modules.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "newtab",
    name: "New Tab",
    path: "newtab",
    description: "Opens a new tab page.",
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "newtab-footer",
    name: "New Tab Footer",
    path: "newtab-footer",
    description: "Displays the footer section of the new tab page.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "ntp-tiles-internals",
    name: "NTP Tiles Internals",
    path: "ntp-tiles-internals",
    description:
      "Debug information for the tiles shown on the New Tab Page, including suggestions and most visited sites.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "omnibox",
    name: "Omnibox",
    path: "omnibox",
    isInternalDebugging: true,
    description: "Debug and test the Omnibox (address bar) functionality.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "omnibox-popup-top-chrome",
    name: "Omnibox Popup Top Chrome",
    path: "omnibox-popup.top-chrome",
    description: "Debug view of the omnibox (address bar) popup UI in the top chrome area.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "on-device-internals",
    name: "On Device Internals",
    path: "on-device-internals",
    isInternalDebugging: true,
    description: "Debug information for on-device features and machine learning models.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "on-device-translation-internals",
    name: "On-Device Translation Internals",
    path: "on-device-translation-internals",
    description: "Debug information for the browser's on-device translation feature.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "optimization-guide-internals",
    name: "Optimization Guide Internals",
    path: "optimization-guide-internals",
    isInternalDebugging: true,
    description: "Debug interface for the optimization guide that provides hints for browser optimizations.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "password-manager",
    name: "Password Manager",
    path: "password-manager",
    description: (preferredBrowser: { title: string }) =>
      `Interface for viewing and managing passwords saved in ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "password-manager-internals",
    name: "Password Manager Internals",
    path: "password-manager-internals",
    description: "Debug information for the password manager.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "policy",
    name: "Policy",
    path: "policy",
    description: "Displays all policies currently in effect.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "predictors",
    name: "Predictors",
    path: "predictors",
    description: (preferredBrowser: { title: string }) =>
      `View information about ${preferredBrowser.title}'s network and resource predictors.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "prefs-internals",
    name: "Prefs Internals",
    path: "prefs-internals",
    description: (preferredBrowser: { title: string }) =>
      `Shows all internal preferences and settings for ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "print",
    name: "Print",
    path: "print",
    description: "Opens the print preview dialog (usually requires a page to be active).",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "privacy-sandbox-dialog",
    name: "Privacy Sandbox Dialog",
    path: "privacy-sandbox-dialog",
    description: "Interface for Privacy Sandbox settings and controls.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "privacy-sandbox-dialog-debug",
    name: "Privacy Sandbox Dialog Debug",
    path: "privacy-sandbox-dialog/?debug",
    description: "Debugging interface for the Privacy Sandbox dialog, showing technical details and state information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "privacy-sandbox-internals",
    name: "Privacy Sandbox Internals",
    path: "privacy-sandbox-internals",
    description: "Debug information for the Privacy Sandbox features and APIs.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "private-aggregation-internals",
    name: "Private Aggregation Internals",
    path: "private-aggregation-internals",
    description: "Debug information for the Private Aggregation API, part of the Privacy Sandbox.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "process-internals",
    name: "Process Internals",
    path: "process-internals",
    description: "View information about site isolation and process models.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "profile-customization",
    name: "Profile Customization",
    path: "profile-customization",
    description: "Interface for customizing browser profile appearance and settings.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "profile-internals",
    name: "Profile Internals",
    path: "profile-internals",
    isInternalDebugging: true,
    description: "Detailed debug information about the browser's profile and user data.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "profile-picker",
    name: "Profile Picker",
    path: "profile-picker",
    description: "Interface for selecting and managing different browser profiles.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "quota-internals",
    name: "Quota Internals",
    path: "quota-internals",
    description: "View information about disk space quotas for websites.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "read-later-top-chrome",
    name: "Read Later Top Chrome",
    path: "read-later.top-chrome",
    description: "Opens the Read Later feature directly in the browser's top chrome UI area.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "reset-password",
    name: "Reset Password",
    path: "reset-password",
    description: (preferredBrowser: { title: string }) =>
      `Interface for resetting passwords for ${preferredBrowser.title} accounts.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "safe-browsing",
    name: "Safe Browsing",
    path: "safe-browsing",
    isInternalDebugging: true,
    description: "View Safe Browsing information and debug data.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "sandbox",
    name: "Sandbox",
    path: "sandbox",
    description: "Displays information about the browser's sandbox security implementation.",
    supportedBrowsers: ALL_CHROMIUM,
    excludedPlatforms: ["mac"],
  },

  {
    id: "saved-tab-groups-unsupported",
    name: "Saved Tab Groups Unsupported",
    path: "saved-tab-groups-unsupported",
    description: "Shows information page when tab groups feature is unavailable or not supported.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "search-engine-choice",
    name: "Search Engine Choice",
    path: "search-engine-choice",
    description: "Interface for selecting and managing your default search engine.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "segmentation-internals",
    name: "Segmentation Internals",
    path: "segmentation-internals",
    description: "Debug information for Chrome's user segmentation system used for targeted features.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "serviceworker-internals",
    name: "ServiceWorker Internals",
    path: "serviceworker-internals",
    description: "View information about Service Workers and manage them.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "settings",
    name: "Settings",
    path: "settings",
    description: (preferredBrowser: { title: string }) => `Opens the ${preferredBrowser.title} settings page.`,
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "shopping-insights-side-panel-top-chrome",
    name: "Shopping Insights Side Panel Top Chrome",
    path: "shopping-insights-side-panel.top-chrome",
    description: "Shopping comparison and price tracking tools in the browser's side panel.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "signin-dice-web-intercept-top-chrome",
    name: "Sign-in Dice Web Intercept Top Chrome",
    path: "signin-dice-web-intercept.top-chrome",
    description: "Sign-in interception dialog in the browser's top chrome UI area.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "signin-email-confirmation",
    name: "Sign-in Email Confirmation",
    path: "signin-email-confirmation",
    description: "Email confirmation page for browser account sign-in process.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "signin-error",
    name: "Sign-in Error",
    path: "signin-error",
    description: "Error page displayed when sign-in to browser accounts fails.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "signin-internals",
    name: "Signin Internals",
    path: "signin-internals",
    description: (preferredBrowser: { title: string }) =>
      `View information about ${preferredBrowser.title} sign-in status and accounts.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "signout-confirmation",
    name: "Sign-out Confirmation",
    path: "signout-confirmation",
    description: "Confirmation page when signing out of browser accounts.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "site-engagement",
    name: "Site Engagement",
    path: "site-engagement",
    description: "View engagement scores for websites you visit.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "skills-manager",
    name: "Skills Manager",
    path: "skills-manager",
    description: "Interface for managing browser skills and capabilities.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "start-page",
    name: "Start Page",
    path: "start-page",
    description: "Displays the browser's start page shown when first opening the browser.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "suggest-internals",
    name: "Suggest Internals",
    path: "suggest-internals",
    description: "Debug information for the browser's suggestion systems (search, URL, etc.).",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "suggestions",
    name: "Suggestions",
    path: "suggestions",
    description: "Content suggestions for the New Tab Page.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "support-tool",
    name: "Support Tool",
    path: "support-tool",
    description: (preferredBrowser: { title: string }) =>
      `Troubleshooting and diagnostic tool for ${preferredBrowser.title} problems.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "sync-confirmation",
    name: "Sync Confirmation",
    path: "sync-confirmation",
    description: "Confirmation page for enabling browser data synchronization.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "sync-internals",
    name: "Sync Internals",
    path: "sync-internals",
    description: (preferredBrowser: { title: string }) =>
      `View detailed information about ${preferredBrowser.title} Sync.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "system",
    name: "System",
    path: "system",
    description: (preferredBrowser: { title: string }) =>
      `Provides system information relevant to ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "tab-group-home",
    name: "Tab Group Home",
    path: "tab-group-home",
    description: "Home page for managing and organizing tab groups.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "tab-search-top-chrome",
    name: "Tab Search Top Chrome",
    path: "tab-search.top-chrome",
    description: "Opens the tab search interface directly in the browser's top chrome UI area.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "tab-strip-internals",
    name: "Tab Strip Internals",
    path: "tab-strip-internals",
    isInternalDebugging: true,
    description: "Debug information for the browser's tab strip UI component.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "terms",
    name: "Terms",
    path: "terms",
    description: (preferredBrowser: { title: string }) => `Displays the ${preferredBrowser.title} Terms of Service.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "topics-internals",
    name: "Topics Internals",
    path: "topics-internals",
    description: "Debug information for the Topics API, part of the Privacy Sandbox for interest-based advertising.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "traces",
    name: "Traces",
    path: "traces",
    isInternalDebugging: true,
    description: "Interface for viewing and analyzing browser performance traces.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "traces-internals",
    name: "Traces Internals",
    path: "traces-internals",
    isInternalDebugging: true,
    description: "Detailed debug information about browser tracing functionality.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "tracing",
    name: "Tracing",
    path: "tracing",
    description: (preferredBrowser: { title: string }) =>
      `Record performance traces for debugging ${preferredBrowser.title} performance issues.`,
    isInternalDebugging: true,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "translate-internals",
    name: "Translate Internals",
    path: "translate-internals",
    description: (preferredBrowser: { title: string }) =>
      `Displays information about ${preferredBrowser.title}'s translation feature.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "ukm",
    name: "UKM",
    path: "ukm",
    isInternalDebugging: true,
    description: "Debug information for the Unified Keyed Metrics system that collects browser usage data.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "usb-internals",
    name: "USB Internals",
    path: "usb-internals",
    description: "Displays information about connected USB devices and their properties.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "user-actions",
    name: "User Actions",
    path: "user-actions",
    isInternalDebugging: true,
    description: "Displays user action metrics and debugging information for browser interactions.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "user-education-internals",
    name: "User Education Internals",
    path: "user-education-internals",
    isInternalDebugging: true,
    description: "Debug information for the browser's user education features like tutorials and tooltips.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "version",
    name: "Version",
    path: "version",
    description: (preferredBrowser: { title: string }) =>
      `Displays ${preferredBrowser.title} version information and links to copy details.`,
    supportedBrowsers: BASIC_ONLY,
  },

  {
    id: "view-cert",
    name: "View Certificate",
    path: "view-cert",
    description: "Detailed view of SSL/TLS certificates for websites.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "watermark",
    name: "Watermark",
    path: "watermark",
    description: "Displays watermark-related functionality for the browser.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "web-app-internals",
    name: "Web App Internals",
    path: "web-app-internals",
    description: (preferredBrowser: { title: string }) =>
      `Displays debug information for Progressive Web Apps (PWAs) installed in ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "webrtc-internals",
    name: "WebRTC Internals",
    path: "webrtc-internals",
    description: "Detailed information about WebRTC connections, peer connections, and media streams.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "webrtc-logs",
    name: "WebRTC Logs",
    path: "webrtc-logs",
    isInternalDebugging: true,
    description: "Displays WebRTC debug logs and connection information.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "webui-gallery",
    name: "WebUI Gallery",
    path: "webui-gallery",
    isInternalDebugging: true,
    description: (preferredBrowser: { title: string }) =>
      `Gallery of ${preferredBrowser.title}'s UI components and design system elements.`,
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "webuijserror",
    name: "WebUI JavaScript Error",
    path: "webuijserror",
    isInternalDebugging: true,
    description: "Debug interface for WebUI JavaScript errors and diagnostics.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "whats-new",
    name: "What's New",
    path: "whats-new",
    description: (preferredBrowser: { title: string }) =>
      `Displays a page highlighting new features in ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_CHROMIUM,
    platforms: ["windows", "mac", "linux"],
  },

  // Chrome-untrusted URLs
  {
    id: "compose-untrusted",
    name: "Compose (Untrusted)",
    path: "chrome-untrusted://compose",
    description: "Untrusted context for the compose feature.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "data-sharing-untrusted",
    name: "Data Sharing (Untrusted)",
    path: "chrome-untrusted://data-sharing",
    description: "Untrusted context for data sharing features.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "ntp-microsoft-auth-untrusted",
    name: "NTP Microsoft Auth (Untrusted)",
    path: "chrome-untrusted://ntp-microsoft-auth",
    description: "Untrusted context for New Tab Page Microsoft authentication.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "print-untrusted",
    name: "Print (Untrusted)",
    path: "chrome-untrusted://print",
    description: "Untrusted context for print functionality.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "privacy-sandbox-dialog-untrusted",
    name: "Privacy Sandbox Dialog (Untrusted)",
    path: "chrome-untrusted://privacy-sandbox-dialog",
    description: "Untrusted context for Privacy Sandbox dialog.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "read-anything-side-panel-untrusted",
    name: "Read Anything Side Panel (Untrusted)",
    path: "chrome-untrusted://read-anything-side-panel.top-chrome",
    description: "Untrusted context for the Read Anything side panel feature.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  // Debug/Crash commands (for debugging purposes only)
  {
    id: "badcastcrash",
    name: "Bad Cast Crash",
    path: "badcastcrash",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Triggers a bad cast crash for testing crash reporting.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "crash",
    name: "Crash",
    path: "crash",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Crashes the current renderer process.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "crash-rust",
    name: "Crash Rust",
    path: "crash/rust",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Triggers a crash in Rust code for testing.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "crashdump",
    name: "Crash Dump",
    path: "crashdump",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Forces a crash dump.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "gpuclean",
    name: "GPU Clean",
    path: "gpuclean",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Triggers a clean GPU process termination.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "gpucrash",
    name: "GPU Crash",
    path: "gpucrash",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Crashes the GPU process for testing.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "gpuhang",
    name: "GPU Hang",
    path: "gpuhang",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Causes the GPU process to hang.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "hang",
    name: "Hang",
    path: "hang",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Causes the renderer to hang indefinitely.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "inducebrowsercrashforrealz",
    name: "Induce Browser Crash For Realz",
    path: "inducebrowsercrashforrealz",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Crashes the entire browser process.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "inducebrowserdcheckforrealz",
    name: "Induce Browser DCHECK For Realz",
    path: "inducebrowserdcheckforrealz",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Triggers a DCHECK failure in the browser process.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "kill",
    name: "Kill",
    path: "kill",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Immediately kills the current renderer process.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "memory-exhaust",
    name: "Memory Exhaust",
    path: "memory-exhaust",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Attempts to exhaust available memory.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "memory-pressure-critical",
    name: "Memory Pressure Critical",
    path: "memory-pressure-critical",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Simulates critical memory pressure.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "memory-pressure-moderate",
    name: "Memory Pressure Moderate",
    path: "memory-pressure-moderate",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Simulates moderate memory pressure.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "quit",
    name: "Quit",
    path: "quit",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Immediately quits the browser.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "restart",
    name: "Restart",
    path: "restart",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Restarts the browser.",
    supportedBrowsers: ALL_CHROMIUM,
  },

  {
    id: "shorthang",
    name: "Short Hang",
    path: "shorthang",
    isInternalDebugging: true,
    description: "DEBUG ONLY: Causes a brief hang in the renderer.",
    supportedBrowsers: ALL_CHROMIUM,
  },
];

export const URL_KEY = "secretBrowserCommands.allPaths";
