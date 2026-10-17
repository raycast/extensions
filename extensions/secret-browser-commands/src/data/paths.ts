import { BrowserCommand } from "../types/types";

// Browser support is derived from a live census of chrome://chrome-urls in each
// browser, taken 2026-09-09: Chrome 152, Brave 152, Edge 152, Vivaldi 8.2,
// Opera 135, Comet 145, plus Arc and Dia (both Chromium 152).

const ALL_BROWSERS = ["arc", "brave", "chrome", "comet", "dia", "edge", "opera", "vivaldi"];
const ARC_ONLY = ["arc"];
const BRAVE_ONLY = ["brave"];
const CHROME_LIKE = ["arc", "brave", "chrome", "dia", "vivaldi"];
const CHROME_LIKE_EDGE = ["arc", "brave", "chrome", "dia", "edge", "vivaldi"];
const CHROMIUM_CORE = ["arc", "brave", "chrome", "comet", "dia", "vivaldi"];
const COMET_ONLY = ["comet"];
const DIA_ONLY = ["dia"];
const EDGE_ONLY = ["edge"];
const EXCEPT_COMET = ["arc", "brave", "chrome", "dia", "edge", "opera", "vivaldi"];
const EXCEPT_EDGE = ["arc", "brave", "chrome", "comet", "dia", "opera", "vivaldi"];
const EXCEPT_OPERA = ["arc", "brave", "chrome", "comet", "dia", "edge", "vivaldi"];
const OPERA_ONLY = ["opera"];

export const browserCommands: BrowserCommand[] = [
  {
    id: "1js-internals",
    name: "1JS Internals",
    path: "1js-internals",
    description: "Diagnostics for Edge's 1JS shared front-end framework, used by Edge's built-in web experiences.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "about",
    name: "About",
    path: "about",
    description: (preferredBrowser: { title: string }) =>
      `Provides a list of all ${preferredBrowser.title} URLs, including ones for troubleshooting and debugging.`,
    supportedBrowsers: ["arc", "brave", "chrome", "dia", "edge", "opera"],
  },

  {
    id: "access-code-cast",
    name: "Access Code Cast",
    path: "access-code-cast",
    description: "Provides an interface for casting content using access codes to supported devices.",
    notDirectlyReachable: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "accessibility",
    name: "Accessibility",
    path: "accessibility",
    description:
      "Displays accessibility information for each tab and allows global toggling of accessibility features.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "activity",
    name: "Activity",
    path: "activity",
    description: "Opera's activity feed, showing recent browsing and download events.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "actor-internals",
    name: "Actor Internals",
    path: "actor-internals",
    description: "Debug information for the actor component system.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "actor-overlay",
    name: "Actor Overlay",
    path: "actor-overlay",
    description: "Displays the actor overlay interface for debugging actor-based features.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "adblock",
    name: "Ad Block",
    path: "adblock",
    description: "Brave's ad and tracker blocking settings, including filter list subscriptions.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "adblock-internals",
    name: "Ad Block Internals",
    path: "adblock-internals",
    description: "Debug view for Brave's ad-blocking engine: loaded filter lists, rule counts, and match diagnostics.",
    isInternalDebugging: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "adblock-popup",
    name: "Ad Block Popup",
    path: "adblock-popup",
    description: "Comet's ad-blocking panel, shown from the toolbar shield icon.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "address-bar-dropdown",
    name: "Address Bar Dropdown",
    path: "address-bar-dropdown",
    description: "Opera's address bar suggestion dropdown, rendered as a standalone page.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "agent-internals",
    name: "Agent Internals",
    path: "agent-internals",
    description: "Diagnostics for Edge's browser agent subsystem.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "ai-mode-bar",
    name: "AI Mode Bar",
    path: "ai-mode-bar",
    description: "Opera's AI mode toolbar surface.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "app-service-internals",
    name: "App Service Internals",
    path: "app-service-internals",
    description: "Displays debug information for the App Service.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "app-settings",
    name: "App Settings",
    path: "app-settings",
    description:
      "Provides a settings page for managing Chrome apps and extensions, including advanced configuration options.",
    notDirectlyReachable: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "appcache-internals",
    name: "AppCache Internals",
    path: "appcache-internals",
    description: "Displays Application Cache (AppCache) internal status and debugging information.",
    isDeprecated: true,
    deprecationNote:
      "AppCache was removed from Chromium in Chrome 95. Service worker state now lives at chrome://serviceworker-internals.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "application-guard-internals",
    name: "Application Guard Internals",
    path: "application-guard-internals",
    description:
      "Diagnostics for Microsoft Defender Application Guard, which opens untrusted sites in an isolated container.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "apps",
    name: "Apps",
    path: "apps",
    description: (preferredBrowser: { title: string }) =>
      `Displays the applications that are installed in ${preferredBrowser.title}.`,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "assistant",
    name: "Assistant",
    path: "assistant",
    description: (preferredBrowser: { title: string }) =>
      `Interface for ${preferredBrowser.title}'s built-in virtual assistant features.`,
    supportedBrowsers: DIA_ONLY,
  },

  {
    id: "assistant-optin",
    name: "Assistant Opt-In",
    path: "assistant-optin",
    description: (preferredBrowser: { title: string }) =>
      `Opt-in page for ${preferredBrowser.title}'s built-in virtual assistant features.`,
    isDeprecated: true,
    deprecationNote: "Google Assistant was a ChromeOS-only surface and is no longer registered in desktop builds.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "attribution-internals",
    name: "Attribution Internals",
    path: "attribution-internals",
    description: "Displays debug information for the Attribution Reporting API, used for ad conversion measurement.",
    supportedBrowsers: ["arc", "comet", "opera"],
  },

  {
    id: "autofill-internals",
    name: "Autofill Internals",
    path: "autofill-internals",
    description: "Displays internal logs and debug data for the browser's autofill feature.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "autofill-ml-internals",
    name: "Autofill ML Internals",
    path: "autofill-ml-internals",
    description: "Debug information for machine learning features used in autofill predictions.",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "badcastcrash",
    name: "Bad Cast Crash",
    path: "badcastcrash",
    description: "DEBUG ONLY: Triggers a bad cast crash for testing crash reporting.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "batch-upload",
    name: "Batch Upload",
    path: "batch-upload",
    description: "Provides an interface for uploading multiple files in a single batch operation.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "blob-internals",
    name: "Blob Internals",
    path: "blob-internals",
    description: "Displays all Binary Large Object (BLOB) data currently stored by the browser.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "bluetooth-internals",
    name: "Bluetooth Internals",
    path: "bluetooth-internals",
    description: "Displays detailed information about Bluetooth adapters, connections, and paired devices.",
    supportedBrowsers: ALL_BROWSERS,
    excludedPlatforms: ["mac"],
  },

  {
    id: "bookmarks",
    name: "Bookmarks",
    path: "bookmarks",
    description: "Opens the bookmark manager.",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "bookmarks-panel",
    name: "Bookmarks Panel",
    path: "bookmarks-panel",
    description: "Opera's bookmarks sidebar panel.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "bookmarks-side-panel-top-chrome",
    name: "Bookmarks Side Panel Top Chrome",
    path: "bookmarks-side-panel.top-chrome",
    description: "Opens the bookmarks side panel directly in the browser's top chrome UI area.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "boost",
    name: "Boost",
    path: "boost",
    description: "Arc's Boost editor for customizing the appearance and behavior of individual sites.",
    isInternalDebugging: true,
    supportedBrowsers: ARC_ONLY,
  },

  {
    id: "brave-shields-top-chrome",
    name: "Brave Shields",
    path: "brave-shields.top-chrome",
    description: "The Brave Shields panel: per-site blocking of ads, trackers, fingerprinting, and scripts.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "brave-speedreader-top-chrome",
    name: "Speedreader",
    path: "brave-speedreader.top-chrome",
    description: "Brave's Speedreader panel, which strips page clutter for distraction-free reading.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "browser-switch",
    name: "Browser Switch",
    path: "browser-switch",
    description: "Provides an interface for switching between different browser profiles or instances.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "browserjs",
    name: "Browser JS",
    path: "browserjs",
    description: "Opera's BrowserJS injection diagnostics, showing per-site compatibility scripts.",
    isInternalDebugging: true,
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "cast-feedback",
    name: "Cast Feedback",
    path: "cast-feedback",
    description: "Feedback form for reporting problems with Google Cast.",
    supportedBrowsers: ["chrome"],
  },

  {
    id: "certificate-manager",
    name: "Certificate Manager",
    path: "certificate-manager",
    description: "Manages SSL/TLS certificates, allowing users to view, import, and export them.",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "chrome",
    name: "Chrome",
    path: "chrome",
    description: (preferredBrowser: { title: string }) =>
      `Main internal page for ${preferredBrowser.title} browser information.`,
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "chrome-finds-internals",
    name: "Find Internals",
    path: "chrome-finds-internals",
    description: "Diagnostics for the in-page find feature, including match counts and highlighting state.",
    isInternalDebugging: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE_EDGE,
  },

  {
    id: "chrome-signin",
    name: "Chrome Sign In",
    path: "chrome-signin",
    description: (preferredBrowser: { title: string }) =>
      `Sign-in page for ${preferredBrowser.title} accounts and profiles.`,
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "ai-overlay-dialog-untrusted",
    name: "AI Overlay Dialog (Untrusted)",
    path: "chrome-untrusted://ai-overlay-dialog",
    description:
      "ADVANCED: Isolated security context hosting the in-page AI overlay dialog. Renders model output as untrusted content.",
    isUntrusted: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "aichat-chart-display-untrusted",
    name: "Leo Chart Display (Untrusted)",
    path: "chrome-untrusted://aichat-chart-display",
    description: "ADVANCED: Isolated security context that renders charts produced by Brave's Leo assistant.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "aichat-code-sandbox-untrusted",
    name: "Leo Code Sandbox (Untrusted)",
    path: "chrome-untrusted://aichat-code-sandbox",
    description: "ADVANCED: Isolated sandbox that executes code snippets produced by Brave's Leo assistant.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "compose-untrusted",
    name: "Compose (Untrusted)",
    path: "chrome-untrusted://compose",
    description:
      "ADVANCED: Isolated security context for the AI compose feature. Runs with limited privileges to handle potentially untrusted content. Not intended for direct user access.",
    isUntrusted: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "data-sharing-untrusted",
    name: "Data Sharing (Untrusted)",
    path: "chrome-untrusted://data-sharing",
    description:
      "ADVANCED: Isolated security context for data sharing features. Runs in a sandboxed environment to protect user data. May not function correctly when accessed directly.",
    isUntrusted: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "dia-artifacts-untrusted",
    name: "Dia Artifacts (Untrusted)",
    path: "chrome-untrusted://dia-artifacts",
    description: "ADVANCED: Isolated security context that renders artifacts generated by Dia.",
    isUntrusted: true,
    supportedBrowsers: ["arc", "dia"],
  },

  {
    id: "drive-picker-host-untrusted",
    name: "Drive Picker Host (Untrusted)",
    path: "chrome-untrusted://drive-picker-host",
    description: "ADVANCED: Isolated security context hosting the Google Drive file picker.",
    isUntrusted: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "glic-untrusted",
    name: "Gemini in Chrome (Untrusted)",
    path: "chrome-untrusted://glic",
    description: "ADVANCED: Isolated security context hosting the Gemini-in-Chrome panel's remote content.",
    isUntrusted: true,
    supportedBrowsers: ["brave", "chrome"],
  },

  {
    id: "ledger-bridge-untrusted",
    name: "Ledger Bridge (Untrusted)",
    path: "chrome-untrusted://ledger-bridge",
    description: "ADVANCED: Isolated bridge that talks to a Ledger hardware wallet from Brave Wallet.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "lens-untrusted",
    name: "Lens (Untrusted)",
    path: "chrome-untrusted://lens",
    description: "ADVANCED: Isolated security context for Google Lens visual search results.",
    isUntrusted: true,
    supportedBrowsers: ["brave", "chrome", "comet", "vivaldi"],
  },

  {
    id: "lens-overlay-untrusted",
    name: "Lens Overlay (Untrusted)",
    path: "chrome-untrusted://lens-overlay",
    description: "ADVANCED: Isolated security context for the Lens selection overlay drawn over a page.",
    isUntrusted: true,
    supportedBrowsers: ["brave", "chrome", "comet", "vivaldi"],
  },

  {
    id: "leo-ai-conversation-entries-untrusted",
    name: "Leo Conversation Entries (Untrusted)",
    path: "chrome-untrusted://leo-ai-conversation-entries",
    description: "ADVANCED: Isolated security context that renders Leo conversation history.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "line-chart-display-untrusted",
    name: "Line Chart Display (Untrusted)",
    path: "chrome-untrusted://line-chart-display",
    description: "ADVANCED: Isolated security context that renders line charts in Brave's UI.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "market-display-untrusted",
    name: "Market Display (Untrusted)",
    path: "chrome-untrusted://market-display",
    description: "ADVANCED: Isolated security context that renders crypto market data in Brave Wallet.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "news-untrusted",
    name: "Brave News (Untrusted)",
    path: "chrome-untrusted://news",
    description: "ADVANCED: Isolated security context that renders Brave News feed content.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "nft-display-untrusted",
    name: "NFT Display (Untrusted)",
    path: "chrome-untrusted://nft-display",
    description: "ADVANCED: Isolated security context that renders NFT media in Brave Wallet.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "ntp-microsoft-auth-untrusted",
    name: "NTP Microsoft Auth (Untrusted)",
    path: "chrome-untrusted://ntp-microsoft-auth",
    description:
      "ADVANCED: Isolated security context for New Tab Page Microsoft authentication. Handles third-party authentication in a restricted environment. Direct access may cause authentication errors.",
    isUntrusted: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "print-untrusted",
    name: "Print (Untrusted)",
    path: "chrome-untrusted://print",
    description:
      "ADVANCED: Isolated security context for print preview functionality. Renders print content in a sandboxed environment. May not display correctly when accessed directly.",
    isUntrusted: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "privacy-sandbox-dialog-untrusted",
    name: "Privacy Sandbox Dialog (Untrusted)",
    path: "chrome-untrusted://privacy-sandbox-dialog",
    description:
      "ADVANCED: Isolated security context for Privacy Sandbox settings dialog. Runs with restricted permissions for enhanced security. Direct access may not function properly.",
    isUntrusted: true,
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "read-anything-side-panel-untrusted",
    name: "Read Anything Side Panel (Untrusted)",
    path: "chrome-untrusted://read-anything-side-panel.top-chrome",
    description:
      "ADVANCED: Isolated security context for the Read Anything accessibility feature. Processes web content in a sandboxed environment. May cause errors when accessed directly.",
    isUntrusted: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "trezor-bridge-untrusted",
    name: "Trezor Bridge (Untrusted)",
    path: "chrome-untrusted://trezor-bridge",
    description: "ADVANCED: Isolated bridge that talks to a Trezor hardware wallet from Brave Wallet.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "vpn-panel-top-chrome-untrusted",
    name: "VPN Panel (Untrusted)",
    path: "chrome-untrusted://vpn-panel.top-chrome",
    description: "ADVANCED: Isolated security context hosting Brave VPN's toolbar panel.",
    isUntrusted: true,
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "chrome-urls",
    name: "Chrome URLs",
    path: "chrome-urls",
    description: (preferredBrowser: { title: string }) =>
      `Lists all internal ${preferredBrowser.title} URLs (similar to about page but with a different format).`,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "color-pipeline-internals",
    name: "Color Pipeline Internals",
    path: "color-pipeline-internals",
    description: "Debug information for the browser's color pipeline and color management system.",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "comments-side-panel-top-chrome",
    name: "Comments Side Panel Top Chrome",
    path: "comments-side-panel.top-chrome",
    description: "Opens the comments side panel directly in the browser's top chrome UI area.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "commerce-internals",
    name: "Commerce Internals",
    path: "commerce-internals",
    description: "Displays debug information for commerce-related features, such as price tracking and shopping.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "compare",
    name: "Compare",
    path: "compare",
    description: "Interface for comparing products, prices, or other items.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "compat",
    name: "Compatibility",
    path: "compat",
    description: "Edge's site compatibility settings and Internet Explorer mode configuration.",
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "components",
    name: "Components",
    path: "components",
    description: (preferredBrowser: { title: string }) =>
      `Lists all components installed in ${preferredBrowser.title} and allows you to check for updates.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "conflicts",
    name: "Conflicts",
    path: "conflicts",
    description: "Displays information about software conflicts that may affect browser stability.",
    supportedBrowsers: ["chrome"],
    platforms: ["windows"],
  },

  {
    id: "connection-help",
    name: "Connection Help",
    path: "connection-help",
    description: "Provides troubleshooting information for network connection issues.",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "connection-monitoring-detected",
    name: "Connection Monitoring Detected",
    path: "connection-monitoring-detected",
    description: "Shows a warning page when the browser detects that your connection is being monitored or modified.",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "connectors-internals",
    name: "Connectors Internals",
    path: "connectors-internals",
    description: "Debug information for browser connectors and integrations.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "consent-flow-dialog",
    name: "Consent Flow Dialog",
    path: "consent-flow-dialog",
    description: "Opera's consent and privacy-agreement dialog, rendered as a standalone page.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "constrained-test",
    name: "Constrained Window Test",
    path: "constrained-test",
    description: "A developer test page for constrained (modal) browser windows. Opens a modal that can hang the tab.",
    isInternalDebugging: true,
    supportedBrowsers: ["arc", "brave", "chrome", "dia", "opera", "vivaldi"],
  },

  {
    id: "content-annotator-internals",
    name: "Content Annotator Internals",
    path: "content-annotator-internals",
    description: "Diagnostics for the on-device page content annotation pipeline that feeds page classification.",
    isInternalDebugging: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "content-settings",
    name: "Content Settings",
    path: "content-settings",
    description: "Per-site permission and content settings.",
    isInternalDebugging: true,
    supportedBrowsers: DIA_ONLY,
  },

  {
    id: "context-hub",
    name: "Context Hub",
    path: "context-hub",
    description: "Internal surface for the browser's page-context collection used by on-device AI features.",
    isInternalDebugging: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "contextual-cueing-internals",
    name: "Contextual Cueing Internals",
    path: "contextual-cueing-internals",
    description: "Diagnostics for contextual cueing, which decides when to surface proactive in-page suggestions.",
    isInternalDebugging: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE_EDGE,
  },

  {
    id: "contextual-tasks",
    name: "Contextual Tasks",
    path: "contextual-tasks",
    description: "Internal surface for the contextual task suggestions shown alongside page content.",
    notDirectlyReachable: true,
    supportedBrowsers: ["brave", "chrome", "comet", "vivaldi"],
  },

  {
    id: "conversion-internals",
    name: "Conversion Internals",
    path: "conversion-internals",
    description: "Displays information about conversion tracking and measurement.",
    isDeprecated: true,
    deprecationNote:
      "Renamed to chrome://attribution-internals, which itself has since been dropped by Chrome, Brave, Dia, Edge and Vivaldi along with the Privacy Sandbox Ads APIs. Arc, Comet and Opera still carry it.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "crash",
    name: "Crash",
    path: "crash",
    description: "DEBUG ONLY: Crashes the current renderer process.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "crash-browser-heap-overflow",
    name: "Crash Browser (Heap Overflow)",
    path: "crash/browser/heap-overflow",
    description: "Crashes the browser process with a heap buffer overflow.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-browser-heap-underflow",
    name: "Crash Browser (Heap Underflow)",
    path: "crash/browser/heap-underflow",
    description: "Crashes the browser process with a heap buffer underflow.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-browser-member-dereference-after-free",
    name: "Crash Browser (Member Deref After Free)",
    path: "crash/browser/member-dereference-after-free",
    description: "Crashes the browser process by dereferencing a member after free.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-browser-use-after-free",
    name: "Crash Browser (Use After Free)",
    path: "crash/browser/use-after-free",
    description: "Crashes the browser process with a use-after-free.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-gpu-heap-overflow",
    name: "Crash GPU (Heap Overflow)",
    path: "crash/gpu/heap-overflow",
    description: "Crashes the GPU process with a heap buffer overflow.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-gpu-heap-underflow",
    name: "Crash GPU (Heap Underflow)",
    path: "crash/gpu/heap-underflow",
    description: "Crashes the GPU process with a heap buffer underflow.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-gpu-member-dereference-after-free",
    name: "Crash GPU (Member Deref After Free)",
    path: "crash/gpu/member-dereference-after-free",
    description: "Crashes the GPU process by dereferencing a member after free.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-gpu-use-after-free",
    name: "Crash GPU (Use After Free)",
    path: "crash/gpu/use-after-free",
    description: "Crashes the GPU process with a use-after-free.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-renderer-heap-overflow",
    name: "Crash Renderer (Heap Overflow)",
    path: "crash/renderer/heap-overflow",
    description: "Crashes the current tab's renderer with a heap buffer overflow.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-renderer-heap-underflow",
    name: "Crash Renderer (Heap Underflow)",
    path: "crash/renderer/heap-underflow",
    description: "Crashes the current tab's renderer with a heap buffer underflow.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-renderer-member-dereference-after-free",
    name: "Crash Renderer (Member Deref After Free)",
    path: "crash/renderer/member-dereference-after-free",
    description: "Crashes the current tab's renderer by dereferencing a member after free.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-renderer-use-after-free",
    name: "Crash Renderer (Use After Free)",
    path: "crash/renderer/use-after-free",
    description: "Crashes the current tab's renderer with a use-after-free.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "crash-rust",
    name: "Crash Rust",
    path: "crash/rust",
    description: "DEBUG ONLY: Triggers a crash in Rust code for testing.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "crashdump",
    name: "Crash Dump",
    path: "crashdump",
    description: "DEBUG ONLY: Forces a crash dump.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "crashes",
    name: "Crashes",
    path: "crashes",
    description: (preferredBrowser: { title: string }) =>
      `Displays information about ${preferredBrowser.title} crashes if crash reporting is enabled.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "credits",
    name: "Credits",
    path: "credits",
    description: (preferredBrowser: { title: string }) =>
      `Displays the credits for all open source software used in ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "cross-device-signin-qr-bubble",
    name: "Cross-Device Sign-In QR",
    path: "cross-device-signin-qr-bubble",
    description: "The QR-code bubble used to sign in on another device.",
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE_EDGE,
  },

  {
    id: "customize-chrome-side-panel-top-chrome",
    name: "Customize Chrome Side Panel Top Chrome",
    path: "customize-chrome-side-panel.top-chrome",
    description: (preferredBrowser: { title: string }) =>
      `Opens the customization interface for ${preferredBrowser.title}'s side panel in the top chrome UI.`,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "data-sharing-internals",
    name: "Data Sharing Internals",
    path: "data-sharing-internals",
    description: "Debug information for data sharing features and synchronization.",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "data-viewer",
    name: "Data Viewer",
    path: "data-viewer",
    description: "Edge's viewer for locally stored browser data.",
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "debug-webuis-disabled",
    name: "Debug Webuis Disabled",
    path: "debug-webuis-disabled",
    description: "Displays information about debug UI pages that are currently disabled.",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "default-browser-modal",
    name: "Default Browser Modal",
    path: "default-browser-modal",
    description: "The prompt asking you to make this browser your default.",
    supportedBrowsers: ["arc", "brave", "chrome", "dia"],
  },

  {
    id: "device-log",
    name: "Device Log",
    path: "device-log",
    description: "Displays device-related logs.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "devices",
    name: "Devices",
    path: "devices",
    description: (preferredBrowser: { title: string }) =>
      `Lists physical and virtual devices connected to ${preferredBrowser.title}.`,
    isDeprecated: true,
    deprecationNote: "Removed from Chromium. Cast device state now lives at chrome://media-router-internals.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "dino",
    name: "Dino Game",
    path: "dino",
    description: "Play the hidden dinosaur game (usually shown when offline).",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "discards",
    name: "Discards",
    path: "discards",
    description: "Lists tabs that have been discarded to save memory, and allows manual discarding.",
    isInternalDebugging: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "download-internals",
    name: "Download Internals",
    path: "download-internals",
    description: "View information about active downloads.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "downloads",
    name: "Downloads",
    path: "downloads",
    description: "Displays the list of downloaded files.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "drive-picker-host",
    name: "Drive Picker Host",
    path: "drive-picker-host",
    description: "Host page for the Google Drive file picker embedded in browser UI.",
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "easy-files",
    name: "Easy Files",
    path: "easy-files",
    description: "Opera's Easy Files panel for quick access to recent downloads and attachments.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "easy-setup",
    name: "Easy Setup",
    path: "easy-setup",
    description: "Opera's Easy Setup panel for theme, sidebar, and layout options.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "edge-dlp-internals",
    name: "DLP Internals",
    path: "edge-dlp-internals",
    description: "Diagnostics for Edge's enterprise Data Loss Prevention policies.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "edge-urls",
    name: "Edge URLs",
    path: "edge-urls",
    description: "Edge's own index of internal edge:// pages.",
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "emoji-picker",
    name: "Emoji Picker",
    path: "emoji-picker",
    description: "Opera's built-in emoji picker, rendered as a standalone page.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "enp",
    name: "Edge Notification Platform",
    path: "enp",
    description: "Edge's notification platform surface.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "eppo-features",
    name: "Eppo Features",
    path: "eppo-features",
    description: "Comet's Eppo feature-flag and experiment assignment viewer.",
    isInternalDebugging: true,
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "extensions",
    name: "Extensions",
    path: "extensions",
    description: "Lists all installed extensions and allows you to manage them.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "extensions-internals",
    name: "Extensions Internals",
    path: "extensions-internals",
    description: "Advanced debugging interface for browser extensions, showing detailed technical information.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "extensions-zero-state",
    name: "Extensions Zero State",
    path: "extensions-zero-state",
    description: "Displays the extensions page in its initial/empty state when no extensions are installed.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "family-link-user-internals",
    name: "Family Link User Internals",
    path: "family-link-user-internals",
    description: "Debug information for Family Link user accounts and restrictions.",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "favorites",
    name: "Favorites",
    path: "favorites",
    description: "Edge's favorites (bookmarks) manager.",
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "feature-showcase",
    name: "Feature Showcase",
    path: "feature-showcase",
    description: "Internal page demonstrating newly shipped browser features.",
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "feedback",
    name: "Feedback",
    path: "feedback",
    description: (preferredBrowser: { title: string }) =>
      `Submit feedback and bug reports to ${preferredBrowser.title} developers.`,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "flags",
    name: "Flags",
    path: "flags",
    description: "Access experimental browser features. Be careful, these can break things!",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "gcm-internals",
    name: "GCM Internals",
    path: "gcm-internals",
    description: "Google Cloud Messaging internal information.",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "getting-started",
    name: "Getting Started",
    path: "getting-started",
    description: "Brave's onboarding and getting-started walkthrough.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "glic",
    name: "Gemini in Chrome",
    path: "glic",
    description: "The Gemini-in-Chrome side panel surface.",
    supportedBrowsers: ["brave", "chrome", "comet"],
  },

  {
    id: "glic-experimental-opt-in",
    name: "Gemini Experimental Opt-In",
    path: "glic-experimental-opt-in",
    description: "Opt-in page for experimental Gemini-in-Chrome features.",
    supportedBrowsers: ["brave", "chrome"],
  },

  {
    id: "glic-fre",
    name: "Gemini First-Run",
    path: "glic-fre",
    description: "First-run experience for the browser's built-in AI assistant.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "gpu",
    name: "GPU",
    path: "gpu",
    description: "Shows detailed information about the GPU hardware, drivers, and feature status.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "gpuclean",
    name: "GPU Clean",
    path: "gpuclean",
    description: "DEBUG ONLY: Triggers a clean GPU process termination.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "gpucrash",
    name: "GPU Crash",
    path: "gpucrash",
    description: "DEBUG ONLY: Crashes the GPU process for testing.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "gpuhang",
    name: "GPU Hang",
    path: "gpuhang",
    description: "DEBUG ONLY: Causes the GPU process to hang.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "hang",
    name: "Hang",
    path: "hang",
    description: "DEBUG ONLY: Causes the renderer to hang indefinitely.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "help",
    name: "Help",
    path: "help",
    description: (preferredBrowser: { title: string }) =>
      `Displays ${preferredBrowser.title} version information and about page.`,
    supportedBrowsers: ["arc", "brave", "chrome", "dia", "edge"],
  },

  {
    id: "histograms",
    name: "Histograms",
    path: "histograms",
    description: (preferredBrowser: { title: string }) => `View histograms collected by ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "history",
    name: "History",
    path: "history",
    description: "Opens the browser history page.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "history-clusters-internals",
    name: "History Clusters Internals",
    path: "history-clusters-internals",
    description: "Debug information for the history clustering feature that groups related pages.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "history-clusters-side-panel-top-chrome",
    name: "History Clusters Side Panel Top Chrome",
    path: "history-clusters-side-panel.top-chrome",
    description: "Opens the browsing history organized in clusters within the side panel of the browser UI.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "history-panel",
    name: "History Panel",
    path: "history-panel",
    description: "Opera's history sidebar panel.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "history-side-panel-top-chrome",
    name: "History Side Panel Top Chrome",
    path: "history-side-panel.top-chrome",
    description: "Access browsing history directly from the browser's top chrome UI area.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "history-sync-optin",
    name: "History Sync Opt-in",
    path: "history-sync-optin",
    description: "Page to opt into history synchronization across devices.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "indexeddb-internals",
    name: "IndexedDB Internals",
    path: "indexeddb-internals",
    description: "Displays detailed information about IndexedDB databases and their contents.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "indigo-internals",
    name: "Indigo Internals",
    path: "indigo-internals",
    description: "Diagnostics for the Indigo on-device model runtime.",
    isInternalDebugging: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "inducebrowsercrashforrealz",
    name: "Induce Browser Crash For Realz",
    path: "inducebrowsercrashforrealz",
    description: "DEBUG ONLY: Crashes the entire browser process.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "inducebrowserdcheckforrealz",
    name: "Induce Browser DCHECK For Realz",
    path: "inducebrowserdcheckforrealz",
    description: "DEBUG ONLY: Triggers a DCHECK failure in the browser process.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "infobar-internals",
    name: "Infobar Internals",
    path: "infobar-internals",
    description: "Debug information for browser infobars (notification bars at the top of pages).",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "injection-protection",
    name: "Injection Protection",
    path: "injection-protection",
    description: "Opera's script-injection protection settings.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "inspect",
    name: "Inspect",
    path: "inspect",
    description: "Inspect elements, network activity, and more for web pages and extensions.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "internals",
    name: "Internals",
    path: "internals",
    description: "Gateway page to various internal debugging tools and information.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "internals-gpu",
    name: "Internals GPU",
    path: "internals/gpu",
    description: "Detailed graphics processing unit information.",
    isDeprecated: true,
    deprecationNote: "An Android-only surface. Desktop builds serve chrome://gpu instead.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "internals-media",
    name: "Internals Media",
    path: "internals/media",
    description: "View media playback information and debug media issues.",
    isDeprecated: true,
    deprecationNote: "An Android-only surface. Desktop builds serve chrome://media-internals instead.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "internals-query-tiles",
    name: "Internals Query Tiles",
    path: "internals/query-tiles",
    description: "Debug information for query tiles.",
    isDeprecated: true,
    deprecationNote: "An Android-only surface with no desktop equivalent.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "internals-session-service",
    name: "Internals Session Service",
    path: "internals/session-service",
    description: "Provides diagnostic information about the browser's session service.",
    supportedBrowsers: ["arc", "brave", "chrome", "dia"],
  },

  {
    id: "interstitials",
    name: "Interstitials",
    path: "interstitials",
    description: "Debug interface for various interstitial pages shown by the browser.",
    isInternalDebugging: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "interstitials-ssl",
    name: "Interstitials SSL",
    path: "interstitials/ssl",
    description: "Shows examples of SSL certificate warning pages for testing and debugging purposes.",
    supportedBrowsers: ["arc", "brave", "chrome", "comet", "dia"],
  },

  {
    id: "intro",
    name: "Intro",
    path: "intro",
    description: (preferredBrowser: { title: string }) =>
      `Introduction and onboarding experience for new ${preferredBrowser.title} users.`,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "invalidations",
    name: "Invalidations",
    path: "invalidations",
    description: "View invalidation debug information.",
    isDeprecated: true,
    deprecationNote: "Removed from Chromium. Sync invalidation state is now reported under chrome://sync-internals.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "iwa-dev",
    name: "Isolated Web App Developer Tools",
    path: "iwa-dev",
    description: "Developer tooling for installing and debugging Isolated Web Apps.",
    notDirectlyReachable: true,
    supportedBrowsers: ["brave", "chrome", "dia", "edge", "vivaldi"],
  },

  {
    id: "kill",
    name: "Kill",
    path: "kill",
    description: "DEBUG ONLY: Immediately kills the current renderer process.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "legion-internals",
    name: "Legion Internals",
    path: "legion-internals",
    description: "Diagnostics for Comet's Legion agent runtime.",
    isInternalDebugging: true,
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "leo-ai",
    name: "Leo AI",
    path: "leo-ai",
    description: "Brave's Leo AI assistant panel.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "local-state",
    name: "Local State",
    path: "local-state",
    description: (preferredBrowser: { title: string }) =>
      `Shows a JSON representation of ${preferredBrowser.title}'s local state file.`,
    isInternalDebugging: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "location-internals",
    name: "Location Internals",
    path: "location-internals",
    description: "Debug information for geolocation services and permissions.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "mam-internals",
    name: "MAM Internals",
    path: "mam-internals",
    description: "Diagnostics for Edge's Mobile Application Management policy enforcement.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "managed-user-profile-notice",
    name: "Managed User Profile Notice",
    path: "managed-user-profile-notice",
    description: "Notification page for users with managed/supervised profiles.",
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "management",
    name: "Management",
    path: "management",
    description: "Displays policies set by enterprise administrators (if any).",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "media-engagement",
    name: "Media Engagement",
    path: "media-engagement",
    description: "View engagement scores for media playback.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "media-internals",
    name: "Media Internals",
    path: "media-internals",
    description: "Detailed information about media playback and audio/video components.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "media-router-internals",
    name: "Media Router Internals",
    path: "media-router-internals",
    description: "Debug information for media casting and routing features (like Chromecast functionality).",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "memory-exhaust",
    name: "Memory Exhaust",
    path: "memory-exhaust",
    description: "DEBUG ONLY: Attempts to exhaust available memory.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "memory-internals",
    name: "Memory Internals",
    path: "memory-internals",
    description: "Detailed memory usage information.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "memory-pressure-critical",
    name: "Memory Pressure Critical",
    path: "memory-pressure-critical",
    description: "DEBUG ONLY: Simulates critical memory pressure.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "memory-pressure-moderate",
    name: "Memory Pressure Moderate",
    path: "memory-pressure-moderate",
    description: "DEBUG ONLY: Simulates moderate memory pressure.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "metrics-internals",
    name: "Metrics Internals",
    path: "metrics-internals",
    description: (preferredBrowser: { title: string }) =>
      `Shows internal metrics and usage statistics collected by ${preferredBrowser.title}.`,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "mods",
    name: "Mods",
    path: "mods",
    description: "Opera GX mods: themes, sounds, and browser customizations.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "multistep-filter-internals",
    name: "Multistep Filter Internals",
    path: "multistep-filter-internals",
    description: "Diagnostics for the multistep content filtering pipeline.",
    isInternalDebugging: true,
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "native-bookmarks",
    name: "Native Bookmarks",
    path: "native-bookmarks",
    description: "Dia's native bookmarks manager.",
    supportedBrowsers: DIA_ONLY,
  },

  {
    id: "net-export",
    name: "Net Export",
    path: "net-export",
    description: "Capture network logs for debugging network issues.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "net-internals",
    name: "Net Internals",
    path: "net-internals",
    description: "View detailed network information, including events, DNS, Sockets, etc.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "network-errors",
    name: "Network Errors",
    path: "network-errors",
    description: "View network errors and debugging information.",
    isInternalDebugging: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "new-tab-page",
    name: "New Tab Page",
    path: "new-tab-page",
    description: "Opens the customized new tab page (may differ from chrome://newtab in some browsers).",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "new-tab-page-third-party",
    name: "New Tab Page Third Party",
    path: "new-tab-page-third-party",
    description: "Displays the new tab page with third-party content modules.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "news",
    name: "News",
    path: "news",
    description: "Opera's built-in news feed.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "newtab",
    name: "New Tab",
    path: "newtab",
    description: "Opens a new tab page.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "newtab-footer",
    name: "New Tab Footer",
    path: "newtab-footer",
    description: "Displays the footer section of the new tab page.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "notebooks-internals",
    name: "Notebooks Internals",
    path: "notebooks-internals",
    description: "Diagnostics for the browser's notebooks feature.",
    isInternalDebugging: true,
    supportedBrowsers: ["brave", "chrome", "dia", "vivaldi"],
  },

  {
    id: "ntp-tiles-internals",
    name: "NTP Tiles Internals",
    path: "ntp-tiles-internals",
    description:
      "Debug information for the tiles shown on the New Tab Page, including suggestions and most visited sites.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "omnibox",
    name: "Omnibox",
    path: "omnibox",
    description: "Debug and test the Omnibox (address bar) functionality.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "omnibox-everywhere-top-chrome",
    name: "Omnibox Everywhere",
    path: "omnibox-everywhere.top-chrome",
    description: "The detached omnibox surface used outside the browser toolbar.",
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "omnibox-popup-top-chrome",
    name: "Omnibox Popup Top Chrome",
    path: "omnibox-popup.top-chrome",
    description: "Debug view of the omnibox (address bar) popup UI in the top chrome area.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "on-device-internals",
    name: "On Device Internals",
    path: "on-device-internals",
    description: "Debug information for on-device features and machine learning models.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "on-device-translation-internals",
    name: "On-Device Translation Internals",
    path: "on-device-translation-internals",
    description: "Debug information for the browser's on-device translation feature.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "opera-account",
    name: "Opera Account",
    path: "opera-account",
    description: "Opera account sign-in and sync management.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "opera-diagnostics",
    name: "Opera Diagnostics",
    path: "opera-diagnostics",
    description: "Opera's diagnostics and troubleshooting report.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "optimization-guide-internals",
    name: "Optimization Guide Internals",
    path: "optimization-guide-internals",
    description: "Debug interface for the optimization guide that provides hints for browser optimizations.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "organizer-panel-top-chrome",
    name: "Organizer Panel",
    path: "organizer-panel.top-chrome",
    description: "Dia's tab and content organizer side panel.",
    supportedBrowsers: DIA_ONLY,
  },

  {
    id: "password-manager",
    name: "Password Manager",
    path: "password-manager",
    description: (preferredBrowser: { title: string }) =>
      `Interface for viewing and managing passwords saved in ${preferredBrowser.title}.`,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "password-manager-internals",
    name: "Password Manager Internals",
    path: "password-manager-internals",
    description: "Debug information for the password manager.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "perplexity-onboarding",
    name: "Perplexity Onboarding",
    path: "perplexity-onboarding",
    description: "Comet's first-run onboarding flow.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "perplexity-spotlight",
    name: "Perplexity Spotlight",
    path: "perplexity-spotlight",
    description: "Comet's Spotlight search and assistant overlay.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "personal-context-internals",
    name: "Personal Context Internals",
    path: "personal-context-internals",
    description: "Diagnostics for the on-device personal context store used by AI features.",
    isInternalDebugging: true,
    notDirectlyReachable: true,
    supportedBrowsers: ["arc", "brave", "chrome", "vivaldi"],
  },

  {
    id: "personal-context-notice",
    name: "Personal Context Notice",
    path: "personal-context-notice",
    description: "The disclosure shown before personal context is used by AI features.",
    supportedBrowsers: ["arc", "brave", "chrome", "vivaldi"],
  },

  {
    id: "player-service",
    name: "Player Service",
    path: "player-service",
    description: "Opera's built-in music player service surface.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "policy",
    name: "Policy",
    path: "policy",
    description: "Displays all policies currently in effect.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "predictors",
    name: "Predictors",
    path: "predictors",
    description: (preferredBrowser: { title: string }) =>
      `View information about ${preferredBrowser.title}'s network and resource predictors.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "prefs-internals",
    name: "Prefs Internals",
    path: "prefs-internals",
    description: (preferredBrowser: { title: string }) =>
      `Shows all internal preferences and settings for ${preferredBrowser.title}.`,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "print",
    name: "Print",
    path: "print",
    description: "Opens the print preview dialog (usually requires a page to be active).",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "privacy-sandbox-dialog",
    name: "Privacy Sandbox Dialog",
    path: "privacy-sandbox-dialog",
    description: "Interface for Privacy Sandbox settings and controls.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "privacy-sandbox-dialog-debug",
    name: "Privacy Sandbox Dialog Debug",
    path: "privacy-sandbox-dialog/?debug",
    description: "Debugging interface for the Privacy Sandbox dialog, showing technical details and state information.",
    isDeprecated: true,
    deprecationNote:
      "The ?debug parameter is gone. Chrome dropped the consent dialog itself alongside the Privacy Sandbox Ads APIs; only Comet still serves chrome://privacy-sandbox-dialog.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "privacy-sandbox-internals",
    name: "Privacy Sandbox Internals",
    path: "privacy-sandbox-internals",
    description: "Debug information for the Privacy Sandbox features and APIs.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "private-aggregation-internals",
    name: "Private Aggregation Internals",
    path: "private-aggregation-internals",
    description: "Debug information for the Private Aggregation API, part of the Privacy Sandbox.",
    supportedBrowsers: ["arc", "comet", "opera"],
  },

  {
    id: "private-ai-internals",
    name: "Private AI Internals",
    path: "private-ai-internals",
    description: "Diagnostics for the on-device private AI runtime.",
    isInternalDebugging: true,
    supportedBrowsers: CHROME_LIKE,
  },

  {
    id: "process-internals",
    name: "Process Internals",
    path: "process-internals",
    description: "View information about site isolation and process models.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "profile-customization",
    name: "Profile Customization",
    path: "profile-customization",
    description: "Interface for customizing browser profile appearance and settings.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "profile-internals",
    name: "Profile Internals",
    path: "profile-internals",
    description: "Detailed debug information about the browser's profile and user data.",
    isInternalDebugging: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "profile-picker",
    name: "Profile Picker",
    path: "profile-picker",
    description: "Interface for selecting and managing different browser profiles.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "psst",
    name: "PSST",
    path: "psst",
    description: "Brave's Privacy Settings Sync Tool, which applies privacy-friendly defaults on supported sites.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "push-internals",
    name: "Push Internals",
    path: "push-internals",
    description: "Diagnostics for Edge's push notification subsystem.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "quit",
    name: "Quit",
    path: "quit",
    description: "DEBUG ONLY: Immediately quits the browser.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "quota-internals",
    name: "Quota Internals",
    path: "quota-internals",
    description: "View information about disk space quotas for websites.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "read-later-top-chrome",
    name: "Read Later Top Chrome",
    path: "read-later.top-chrome",
    description: "Opens the Read Later feature directly in the browser's top chrome UI area.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "regional-capabilities-internals",
    name: "Regional Capabilities Internals",
    path: "regional-capabilities-internals",
    description: "Diagnostics for region-gated browser capabilities and the country detection behind them.",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "reset-password",
    name: "Reset Password",
    path: "reset-password",
    description: (preferredBrowser: { title: string }) =>
      `Interface for resetting passwords for ${preferredBrowser.title} accounts.`,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "restart",
    name: "Restart",
    path: "restart",
    description: "DEBUG ONLY: Restarts the browser.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "rewards-top-chrome",
    name: "Brave Rewards",
    path: "rewards.top-chrome",
    description: "The Brave Rewards panel for tips, ads, and BAT balances.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "rich-hints-console",
    name: "Rich Hints Console",
    path: "rich-hints-console",
    description: "Opera's console for the rich hints shown in the address bar.",
    isInternalDebugging: true,
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "rich-wallpaper",
    name: "Rich Wallpaper",
    path: "rich-wallpaper",
    description: "Opera's animated wallpaper configuration.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "safe-browsing",
    name: "Safe Browsing",
    path: "safe-browsing",
    description: "View Safe Browsing information and debug data.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "sandbox",
    name: "Sandbox",
    path: "sandbox",
    description: "Displays information about the browser's sandbox security implementation.",
    supportedBrowsers: ["chrome"],
    platforms: ["windows", "linux"],
  },

  {
    id: "saved-tab-groups-unsupported",
    name: "Saved Tab Groups Unsupported",
    path: "saved-tab-groups-unsupported",
    description: "Shows information page when tab groups feature is unavailable or not supported.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "search-engine-choice",
    name: "Search Engine Choice",
    path: "search-engine-choice",
    description: "Interface for selecting and managing your default search engine.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "security-diagnostics",
    name: "Security Diagnostics",
    path: "security-diagnostics",
    description: "Edge's security diagnostics report.",
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "segmentation-internals",
    name: "Segmentation Internals",
    path: "segmentation-internals",
    description: "Debug information for Chrome's user segmentation system used for targeted features.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "serviceworker-internals",
    name: "ServiceWorker Internals",
    path: "serviceworker-internals",
    description: "View information about Service Workers and manage them.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "settings",
    name: "Settings",
    path: "settings",
    description: (preferredBrowser: { title: string }) => `Opens the ${preferredBrowser.title} settings page.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "settings-one",
    name: "Settings One",
    path: "settings-one",
    description: "Opera's unified settings surface.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "sharing-point",
    name: "Sharing Point",
    path: "sharing-point",
    description: "Opera's cross-device sharing surface (My Flow).",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "shopping-insights-side-panel-top-chrome",
    name: "Shopping Insights Side Panel Top Chrome",
    path: "shopping-insights-side-panel.top-chrome",
    description: "Shopping comparison and price tracking tools in the browser's side panel.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "shorthang",
    name: "Short Hang",
    path: "shorthang",
    description: "DEBUG ONLY: Causes a brief hang in the renderer.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "sidebar",
    name: "Sidebar",
    path: "sidebar",
    description: "Comet's sidebar surface.",
    supportedBrowsers: COMET_ONLY,
  },

  {
    id: "sidebar-setup",
    name: "Sidebar Setup",
    path: "sidebar-setup",
    description: "Opera's sidebar configuration panel.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "signin-dice-web-intercept-top-chrome",
    name: "Sign-in Dice Web Intercept Top Chrome",
    path: "signin-dice-web-intercept.top-chrome",
    description: "Sign-in interception dialog in the browser's top chrome UI area.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "signin-email-confirmation",
    name: "Sign-in Email Confirmation",
    path: "signin-email-confirmation",
    description: "Email confirmation page for browser account sign-in process.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "signin-error",
    name: "Sign-in Error",
    path: "signin-error",
    description: "Error page displayed when sign-in to browser accounts fails.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "signin-internals",
    name: "Signin Internals",
    path: "signin-internals",
    description: (preferredBrowser: { title: string }) =>
      `View information about ${preferredBrowser.title} sign-in status and accounts.`,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "signin-qrcode-bar",
    name: "Sign-In QR Bar",
    path: "signin-qrcode-bar",
    description: "Arc's QR-code sign-in bar for authenticating on another device.",
    supportedBrowsers: ARC_ONLY,
  },

  {
    id: "signout-confirmation",
    name: "Sign-out Confirmation",
    path: "signout-confirmation",
    description: "Confirmation page when signing out of browser accounts.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "site-engagement",
    name: "Site Engagement",
    path: "site-engagement",
    description: "View engagement scores for websites you visit.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "skills",
    name: "Skills",
    path: "skills",
    description: "The browser's Skills surface for agentic browsing capabilities.",
    supportedBrowsers: ["brave", "chrome", "edge", "vivaldi"],
  },

  {
    id: "skills-manager",
    name: "Skills Manager",
    path: "skills-manager",
    description: "Interface for managing browser skills and capabilities.",
    isDeprecated: true,
    deprecationNote: "Folded into chrome://skills.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "snapshot-selfie",
    name: "Snapshot Selfie",
    path: "snapshot-selfie",
    description: "Opera's snapshot tool with camera capture.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "start-page",
    name: "Start Page",
    path: "start-page",
    description: "Displays the browser's start page shown when first opening the browser.",
    supportedBrowsers: DIA_ONLY,
  },

  {
    id: "startpage",
    name: "Start Page",
    path: "startpage",
    description: "Opera's Speed Dial start page.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "startpageshared",
    name: "Start Page (Shared)",
    path: "startpageshared",
    description: "Shared resources backing Opera's Speed Dial start page.",
    isInternalDebugging: true,
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "styleguide",
    name: "Style Guide",
    path: "styleguide",
    description: "Opera's internal UI component style guide.",
    isInternalDebugging: true,
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "subresource-filter-internals",
    name: "Subresource Filter Internals",
    path: "subresource-filter-internals",
    description: "Diagnostics for the subresource filter that blocks ads on abusive sites.",
    isInternalDebugging: true,
    supportedBrowsers: CHROME_LIKE_EDGE,
  },

  {
    id: "suggest-internals",
    name: "Suggest Internals",
    path: "suggest-internals",
    description: "Debug information for the browser's suggestion systems (search, URL, etc.).",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "suggestions",
    name: "Suggestions",
    path: "suggestions",
    description: "Content suggestions for the New Tab Page.",
    isDeprecated: true,
    deprecationNote: "Removed from Chromium. The New Tab Page now renders suggestions directly.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "support-tool",
    name: "Support Tool",
    path: "support-tool",
    description: (preferredBrowser: { title: string }) =>
      `Troubleshooting and diagnostic tool for ${preferredBrowser.title} problems.`,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "sync-confirmation",
    name: "Sync Confirmation",
    path: "sync-confirmation",
    description: "Confirmation page for enabling browser data synchronization.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "sync-internals",
    name: "Sync Internals",
    path: "sync-internals",
    description: (preferredBrowser: { title: string }) =>
      `View detailed information about ${preferredBrowser.title} Sync.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "sync-login",
    name: "Sync Login",
    path: "sync-login",
    description: "Opera's sync sign-in flow.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "system",
    name: "System",
    path: "system",
    description: (preferredBrowser: { title: string }) =>
      `Provides system information relevant to ${preferredBrowser.title}.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "tab-group-home",
    name: "Tab Group Home",
    path: "tab-group-home",
    description: "Home page for managing and organizing tab groups.",
    requiresFeatureFlag: "TabGroupHome",
    notDirectlyReachable: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "tab-search-top-chrome",
    name: "Tab Search Top Chrome",
    path: "tab-search.top-chrome",
    description: "Opens the tab search interface directly in the browser's top chrome UI area.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "tab-strip-internals",
    name: "Tab Strip Internals",
    path: "tab-strip-internals",
    description: "Debug information for the browser's tab strip UI component.",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "tabs-from-other-devices-top-chrome",
    name: "Tabs From Other Devices",
    path: "tabs-from-other-devices.top-chrome",
    description: "The side panel listing tabs open on your other signed-in devices.",
    notDirectlyReachable: true,
    supportedBrowsers: CHROME_LIKE_EDGE,
  },

  {
    id: "terms",
    name: "Terms",
    path: "terms",
    description: (preferredBrowser: { title: string }) => `Displays the ${preferredBrowser.title} Terms of Service.`,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "themes",
    name: "Themes",
    path: "themes",
    description: "Opera's theme picker.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "topics-internals",
    name: "Topics Internals",
    path: "topics-internals",
    description: "Debug information for the Topics API, part of the Privacy Sandbox for interest-based advertising.",
    supportedBrowsers: ["arc", "comet"],
  },

  {
    id: "traces",
    name: "Traces",
    path: "traces",
    description: "Interface for viewing and analyzing browser performance traces.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "traces-internals",
    name: "Traces Internals",
    path: "traces-internals",
    description: "Detailed debug information about browser tracing functionality.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "tracing",
    name: "Tracing",
    path: "tracing",
    description: (preferredBrowser: { title: string }) =>
      `Record performance traces for debugging ${preferredBrowser.title} performance issues.`,
    isInternalDebugging: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "translate-internals",
    name: "Translate Internals",
    path: "translate-internals",
    description: (preferredBrowser: { title: string }) =>
      `Displays information about ${preferredBrowser.title}'s translation feature.`,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "uithreadhang",
    name: "Hang UI Thread",
    path: "uithreadhang",
    description: "Deliberately hangs the browser's UI thread. For testing hang detection only.",
    isDebugCommand: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "ukm",
    name: "UKM",
    path: "ukm",
    description: "Debug information for the Unified Keyed Metrics system that collects browser usage data.",
    isInternalDebugging: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "unexportable-keys-internals",
    name: "Unexportable Keys Internals",
    path: "unexportable-keys-internals",
    description: "Diagnostics for hardware-backed, non-exportable cryptographic keys used for device binding.",
    isInternalDebugging: true,
    notDirectlyReachable: true,
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "update",
    name: "Update",
    path: "update",
    description: "Opera's browser update status page.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "updater",
    name: "Updater",
    path: "updater",
    description: "Diagnostics for the browser's background update service.",
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "usb-internals",
    name: "USB Internals",
    path: "usb-internals",
    description: "Displays information about connected USB devices and their properties.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "user-actions",
    name: "User Actions",
    path: "user-actions",
    description: "Displays user action metrics and debugging information for browser interactions.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "user-education-internals",
    name: "User Education Internals",
    path: "user-education-internals",
    description: "Debug information for the browser's user education features like tutorials and tooltips.",
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "version",
    name: "Version",
    path: "version",
    description: (preferredBrowser: { title: string }) =>
      `Displays ${preferredBrowser.title} version information and links to copy details.`,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "video-conference-detached",
    name: "Video Conference (Detached)",
    path: "video-conference-detached",
    description: "Opera's detached video-conference controls window.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "view-cert",
    name: "View Certificate",
    path: "view-cert",
    description: "Detailed view of SSL/TLS certificates for websites.",
    supportedBrowsers: EXCEPT_EDGE,
  },

  {
    id: "vpn-pro",
    name: "VPN Pro",
    path: "vpn-pro",
    description: "Opera's VPN Pro subscription and configuration surface.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "wallet",
    name: "Wallet",
    path: "wallet",
    description: "The browser's built-in wallet: payment methods in Edge, crypto accounts in Brave.",
    supportedBrowsers: ["brave", "edge"],
  },

  {
    id: "wallet-panel-top-chrome",
    name: "Wallet Panel",
    path: "wallet-panel.top-chrome",
    description: "Brave Wallet's toolbar panel.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "wallet-passwords",
    name: "Wallet Passwords",
    path: "wallet/passwords",
    description: "Edge's saved password manager inside Wallet.",
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "watermark",
    name: "Watermark",
    path: "watermark",
    description: "Displays watermark-related functionality for the browser.",
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "web-app-internals",
    name: "Web App Internals",
    path: "web-app-internals",
    description: (preferredBrowser: { title: string }) =>
      `Displays debug information for Progressive Web Apps (PWAs) installed in ${preferredBrowser.title}.`,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "web3-selector",
    name: "Web3 Selector",
    path: "web3-selector",
    description: "Opera's Web3 wallet selector.",
    supportedBrowsers: OPERA_ONLY,
  },

  {
    id: "webcompat",
    name: "Web Compatibility",
    path: "webcompat",
    description: "Brave's web compatibility reporting tool.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "webnn-internals",
    name: "WebNN Internals",
    path: "webnn-internals",
    description: "Diagnostics for the Web Neural Network API, including available accelerators.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_COMET,
  },

  {
    id: "webrtc-internals",
    name: "WebRTC Internals",
    path: "webrtc-internals",
    description: "Detailed information about WebRTC connections, peer connections, and media streams.",
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "webrtc-logs",
    name: "WebRTC Logs",
    path: "webrtc-logs",
    description: "Displays WebRTC debug logs and connection information.",
    isInternalDebugging: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "webui-browser",
    name: "WebUI Browser",
    path: "webui-browser",
    description: "Internal browser for inspecting the browser's own WebUI pages.",
    isInternalDebugging: true,
    notDirectlyReachable: true,
    supportedBrowsers: ["brave", "chrome", "comet", "edge", "vivaldi"],
  },

  {
    id: "webui-gallery",
    name: "WebUI Gallery",
    path: "webui-gallery",
    description: (preferredBrowser: { title: string }) =>
      `Gallery of ${preferredBrowser.title}'s UI components and design system elements.`,
    isInternalDebugging: true,
    supportedBrowsers: CHROMIUM_CORE,
  },

  {
    id: "webui-toolbar-top-chrome",
    name: "WebUI Toolbar",
    path: "webui-toolbar.top-chrome",
    description: "The WebUI-rendered browser toolbar surface.",
    notDirectlyReachable: true,
    supportedBrowsers: EXCEPT_OPERA,
  },

  {
    id: "webuijserror",
    name: "WebUI JavaScript Error",
    path: "webuijserror",
    description: "Debug interface for WebUI JavaScript errors and diagnostics.",
    isDebugCommand: true,
    supportedBrowsers: ALL_BROWSERS,
  },

  {
    id: "welcome-new",
    name: "Welcome",
    path: "welcome-new",
    description: "Brave's new-user welcome flow.",
    supportedBrowsers: BRAVE_ONLY,
  },

  {
    id: "whats-new",
    name: "What's New",
    path: "whats-new",
    description: (preferredBrowser: { title: string }) =>
      `Displays a page highlighting new features in ${preferredBrowser.title}.`,
    supportedBrowsers: CHROMIUM_CORE,
    platforms: ["windows", "mac", "linux"],
  },

  {
    id: "workspaces-internals",
    name: "Workspaces Internals",
    path: "workspaces-internals",
    description: "Diagnostics for Edge Workspaces, the shared browsing session feature.",
    isInternalDebugging: true,
    supportedBrowsers: EDGE_ONLY,
  },

  {
    id: "wormhole",
    name: "Wormhole",
    path: "wormhole",
    description: "Comet's Wormhole surface for moving context between tabs.",
    supportedBrowsers: COMET_ONLY,
  },
];
