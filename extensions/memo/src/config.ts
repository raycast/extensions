export const DEFAULT_NOTION_ICON = "📄"
export const DONATION_URL = "https://www.buymeacoffee.com/pluqin"
export const FEEDBACK_URL = "https://forms.gle/XAbP57BWfs6JA4T99"

export const NOTION_RECENT_PAGE_PERSISTENCE_KEY = "notion_recent_page_id"
export const NOTION_SEARCH_RETRY = 3

export const NOTION_INTEGRATION_TEST_API_TOKEN: string = process.env.NOTION_INTEGRATION_TEST_API_TOKEN ?? ""
export const NOTION_OAUTH_AUTHORIZE_URL = "https://oauth-proxy.memo.pluqin.io/api/notion/authorise"
export const NOTION_TOKEN_URL = "https://oauth-proxy.memo.pluqin.io/api/notion/access-token"
export const NOTION_OAUTH_PROXY_REDIRECT_URL = "https://oauth-proxy.memo.pluqin.io/api/notion/code"

// no need, already has on the proxy
export const NOTION_OAUTH_CLIENT_ID = ""
export const NOTION_OAUTH_SCOPE = ""
