import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  openMode: "direct" | "navigate" | "sow";
};

const preferences = getPreferenceValues<Preferences>();

export function buildServiceNowUrl(instanceName: string, relativeUrl: string): string {
  const openMode = preferences.openMode;
  const instanceUrl = `https://${instanceName}.service-now.com`;
  let cleanUrl = relativeUrl.startsWith("/") ? relativeUrl.slice(1) : relativeUrl;

  // Handle special cases
  if (cleanUrl.includes("$knowledge.do")) {
    const parts = cleanUrl.split("?");
    const queryString = parts.length > 1 ? parts[1] : "";
    const queryParams = new URLSearchParams(queryString);
    const query = queryParams.get("query") || "";
    cleanUrl = `kb_knowledge_list.do?sysparm_query=GOTO123TEXTQUERY321=${query}^workflow_state=published^active=true`;
  }

  if (cleanUrl.includes("catalog_find.do")) {
    const parts = cleanUrl.split("?");
    const queryString = parts.length > 1 ? parts[1] : "";
    const queryParams = new URLSearchParams(queryString);
    const query = queryParams.get("sysparm_search") || "";
    cleanUrl = `sc_cat_item_list.do?sysparm_query=GOTO123TEXTQUERY321=${query}^active=true`;
  }

  if (cleanUrl.startsWith("now/") || openMode === "direct" || cleanUrl.includes("documate.do")) {
    return `${instanceUrl}/${cleanUrl}`;
  }

  if (openMode === "navigate") {
    return `${instanceUrl}/nav_to.do?uri=${cleanUrl}`;
  }

  // If openMode === "sow"
  const [path, queryString = ""] = cleanUrl.split("?");
  const queryParams = new URLSearchParams(queryString);

  if (path.endsWith("_list.do")) {
    const table = path.split("_list.do")[0];
    const baseUrl = `${instanceUrl}/now/sow/simplelist/${table}`;
    const query = queryParams.get("sysparm_query") || "";

    return query ? `${baseUrl}/params/query/${query}` : baseUrl;
  }

  if (path.includes("_cat_item")) {
    const sys_id = queryParams.get("sysparm_id") || "";
    return `${instanceUrl}/now/sow/record/sc_cat_item/${sys_id}`;
  }

  if (path.includes("kb_view")) {
    const sys_id = queryParams.get("sys_kb_id") || "";
    return `${instanceUrl}/now/sow/kb_view/kb_knowledge/${sys_id}`;
  }

  const sysId = queryParams.get("sys_id");
  if (path.endsWith(".do") && sysId) {
    const table = path.split(".do")[0];
    return `${instanceUrl}/now/sow/record/${table}/${sysId}`;
  }

  // Since not all ServiceNow pages are compatible with SOW, fallback to nav_to.do
  return `${instanceUrl}/nav_to.do?uri=${cleanUrl}`;
}
