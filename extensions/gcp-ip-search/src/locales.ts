export type Language = "en" | "zh-TW";

export interface Translations {
  // Main search view
  searchPlaceholder: string;
  searchTitle: string;
  newSearch: string;
  startSearch: string;
  recentSearches: string;
  viewResults: string;
  searchAgain: string;
  removeFromHistory: string;
  statusChecking: string;
  statusSuccess: string;
  statusError: string;

  // Results view
  scanningPlaceholder: string;
  filterPlaceholder: string;
  resultsFor: string;
  scanningProjects: string;
  initializing: string;
  currentProject: string;
  startingSearch: string;
  foundResources: string;
  resource: string;
  resources: string;
  noResourcesFound: string;
  noResourcesDescription: string;
  projectId: string;
  regionZone: string;
  openInGCPConsole: string;
  copyLink: string;
  showDetails: string;
  hideDetails: string;

  // Resource details
  resourceName: string;
  resourceType: string;
  ipAddress: string;
  ipVersion: string;
  addressType: string;
  region: string;
  subnetwork: string;
  networkTier: string;
  status: string;
  usedBy: string;

  // Error messages
  invalidIP: string;
  invalidIPMessage: string;
  gcloudNotFound: string;
  gcloudNotFoundMessage: string;
  installCommand: string;
  authRequired: string;
  authRequiredMessage: string;
  loginCommand: string;
  connectionError: string;
  connectionErrorMessage: string;
  checkAuthCommand: string;
  errorDetails: string;
  howToFix: string; // "How to Fix"
  copyCommand: string; // "Copy Command" / "複製指令"

  // Welcome View
  welcomeTitle: string;
  welcomeDescription: string;
  usageTip: string;

  openGCPConsole: string;
  noProjectsFound: string;
  noProjectsMessage: string;
  searchFailed: string;

  // Language settings
  language: string;
  changeLanguage: string;
  english: string;
  chinese: string;

  // Status and misc
  status_label: string;
  in: string;
  projects: string;
  lastSearched: string;
  foundInProjects: string;

  // Resource type names
  resourceTypeForwardingRule: string;
  resourceTypeAddress: string;
  resourceTypeComputeInstance: string;
  resourceTypeRouter: string;
  resourceTypeResource: string;

  // Status Names
  statusRunning: string;
  statusStopped: string;
  statusTerminated: string;
  statusInUse: string;
  statusReserved: string;
  statusEphemeral: string;
  statusStatic: string;

  // Network Tiers & Address Types
  tierPremium: string;
  tierStandard: string;
  typeInternal: string;
  typeExternal: string;

  // IP Labels
  lblInternalIP: string;
  lblExternalIP: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Main search view
    searchPlaceholder: "Search IP or Select History...",
    searchTitle: "Search GCP IP Address",
    newSearch: "New Search",
    startSearch: "Start Search",
    recentSearches: "Recent Searches",
    viewResults: "View Results",
    searchAgain: "Search Again",
    removeFromHistory: "Remove from History",
    statusChecking: "Checking...",
    statusSuccess: "✅",
    statusError: "🚫",

    // Results view
    scanningPlaceholder: "Scanning...",
    filterPlaceholder: "Filter results...",
    resultsFor: "Results for",
    scanningProjects: "Scanning Projects",
    initializing: "Initializing...",
    currentProject: "Current:",
    startingSearch: "Starting search...",
    foundResources: "Found",
    resource: "resource",
    resources: "resources",
    noResourcesFound: "No Resources Found",
    noResourcesDescription: "was not found in any of your GCP projects.",
    projectId: "Project ID",
    regionZone: "Region/Zone",
    openInGCPConsole: "Open in GCP Console",
    copyLink: "Copy Link",
    showDetails: "Show Details",
    hideDetails: "Hide Details",

    // Resource details
    resourceName: "Resource Name",
    resourceType: "Resource Type",
    ipAddress: "IP Address",
    ipVersion: "IP Version",
    addressType: "Address Type",
    region: "Region",
    subnetwork: "Subnetwork",
    networkTier: "Network Tier",
    status: "Status",
    usedBy: "Used By",

    // Error messages
    invalidIP: "Invalid IP Address",
    invalidIPMessage: "Please enter a valid IPv4 or IPv6 address",
    gcloudNotFound: "Gcloud CLI Not Found",
    gcloudNotFoundMessage:
      "The Google Cloud SDK is required to use this extension.",
    installCommand: "Install Command",
    authRequired: "Authentication Required",
    authRequiredMessage: "You are not logged in to Google Cloud.",
    loginCommand: "Login Command",
    connectionError: "Connection Error",
    connectionErrorMessage:
      "An unexpected error occurred while connecting to Google Cloud.",
    checkAuthCommand: "Check Auth Command",
    errorDetails: "Error Details:",
    howToFix: "How to Fix",
    copyCommand: "Copy Command",

    // Welcome View
    welcomeTitle: "Welcome to GCP IP Search",
    welcomeDescription:
      "Search for IP addresses across all your Google Cloud projects.",
    usageTip:
      "💡 Tip: Use the search bar above to start. Press Cmd+L to change language.",

    openGCPConsole: "Open Google Cloud Console",
    noProjectsFound: "No GCP projects found",
    noProjectsMessage: "Check your gcloud auth",
    searchFailed: "Search failed",

    // Language settings
    language: "Language",
    changeLanguage: "變更語言 (繁體中文)",
    english: "English",
    chinese: "繁體中文",

    // Status and misc
    status_label: "Status",
    in: "in",
    projects: "projects",
    lastSearched: "Last searched",
    foundInProjects: "found in",

    // Resource type names
    resourceTypeForwardingRule: "Forwarding Rule",
    resourceTypeAddress: "Address",
    resourceTypeComputeInstance: "Compute Instance",
    resourceTypeRouter: "Cloud Router",
    resourceTypeResource: "Resource",

    // Status Names
    statusRunning: "Running",
    statusStopped: "Stopped",
    statusTerminated: "Terminated",
    statusInUse: "In Use",
    statusReserved: "Reserved",
    statusEphemeral: "Ephemeral",
    statusStatic: "Static",

    // Network Tiers & Address Types
    tierPremium: "Premium",
    tierStandard: "Standard",
    typeInternal: "Internal",
    typeExternal: "External",

    // IP Labels
    lblInternalIP: "Internal IP",
    lblExternalIP: "External IP",
  },
  "zh-TW": {
    // Main search view
    searchPlaceholder: "搜尋 IP 或選擇歷史記錄...",
    searchTitle: "搜尋 GCP IP 位址",
    newSearch: "新搜尋",
    startSearch: "開始搜尋",
    recentSearches: "最近搜尋",
    viewResults: "查看結果",
    searchAgain: "再次搜尋",
    removeFromHistory: "從歷史記錄中移除",
    statusChecking: "檢查中...",
    statusSuccess: "✅",
    statusError: "🚫",

    // Results view
    scanningPlaceholder: "掃描中...",
    filterPlaceholder: "篩選結果...",
    resultsFor: "搜尋結果",
    scanningProjects: "掃描專案",
    initializing: "初始化中...",
    currentProject: "目前：",
    startingSearch: "開始搜尋...",
    foundResources: "找到",
    resource: "個資源",
    resources: "個資源",
    noResourcesFound: "找不到資源",
    noResourcesDescription: "在您的任何 GCP 專案中都找不到。",
    projectId: "專案 ID",
    regionZone: "地區/區域",
    openInGCPConsole: "在 GCP 控制台中開啟",
    copyLink: "複製連結",
    showDetails: "顯示詳細資訊",
    hideDetails: "隱藏詳細資訊",

    // Resource details
    resourceName: "資源名稱",
    resourceType: "資源類型",
    ipAddress: "IP 位址",
    ipVersion: "IP 版本",
    addressType: "位址類型",
    region: "地區",
    subnetwork: "子網路",
    networkTier: "網路層級",
    status: "狀態",
    usedBy: "使用者",

    // Error messages
    invalidIP: "無效的 IP 位址",
    invalidIPMessage: "請輸入有效的 IPv4 或 IPv6 位址",
    gcloudNotFound: "找不到 Gcloud CLI",
    gcloudNotFoundMessage: "使用此擴充功能需要 Google Cloud SDK。",
    installCommand: "安裝指令",
    authRequired: "需要驗證",
    authRequiredMessage: "您尚未登入 Google Cloud。",
    loginCommand: "登入指令",
    connectionError: "連線錯誤",
    connectionErrorMessage: "連線至 Google Cloud 時發生未預期的錯誤。",
    checkAuthCommand: "檢查驗證指令",
    errorDetails: "錯誤詳情：",
    howToFix: "如何修復",
    copyCommand: "複製指令",

    // Welcome View
    welcomeTitle: "歡迎使用 GCP IP 搜尋器",
    welcomeDescription: "快速搜尋您所有 Google Cloud 專案中的 IP 位址。",
    usageTip: "💡 提示：使用上方搜尋欄開始搜尋。按 Cmd+L 可切換語言。",

    openGCPConsole: "開啟 Google Cloud 控制台",
    noProjectsFound: "找不到 GCP 專案",
    noProjectsMessage: "請檢查您的 gcloud 驗證",
    searchFailed: "搜尋失敗",

    // Language settings
    language: "語言",
    changeLanguage: "Change Language (English)",
    english: "English",
    chinese: "繁體中文",

    // Status and misc
    status_label: "狀態",
    in: "於",
    projects: "個專案",
    lastSearched: "上次搜尋",
    foundInProjects: "在",

    // Resource type names
    resourceTypeForwardingRule: "轉發規則",
    resourceTypeAddress: "位址",
    resourceTypeComputeInstance: "運算執行個體",
    resourceTypeRouter: "雲端路由器",
    resourceTypeResource: "資源",

    // Status Names
    statusRunning: "執行中",
    statusStopped: "已停止", // Friendly for TERMINATED if we map it
    statusTerminated: "已停止", // User prefers "已停止" or similar friendly term for TERMINATED/OFF
    statusInUse: "使用中",
    statusReserved: "已保留",
    statusEphemeral: "臨時",
    statusStatic: "靜態",

    // Network Tiers & Address Types
    tierPremium: "專業版 (Premium)",
    tierStandard: "標準 (Standard)",
    typeInternal: "內部",
    typeExternal: "外部",

    // IP Labels
    lblInternalIP: "內部 IP",
    lblExternalIP: "外部 IP",
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}
