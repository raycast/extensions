export function extractPathAndParam(pathAndParam: string) {
  let extractedParam = "";
  const pathName: string = pathAndParam.split("?")[0];
  const queryParams = new URLSearchParams(pathAndParam.split("?")[1]);

  const paramSources = [
    { path: "_list.do", param: "sysparm_query" },
    { path: "$pa_dashboard.do", param: "sysparm_dashboard" },
    { path: "$vtb.do", param: "sysparm_board" },
    { path: "com.glideapp.servicecatalog_cat_item_view.", param: "sysparm_id" },
    { path: "documate.do", param: (p: URLSearchParams) => `${p.get("w")}&${p.get("p")}` },
    { path: "kb_view.do", param: "sys_kb_id" },
    { path: "sys_report_template.do", param: "jvar_report_id" },
    {
      path: "system_properties_ui.do",
      param: (p: URLSearchParams) => `${p.get("sysparm_title")}&${p.get("sysparm_category")}`,
    },
  ];

  for (const { path, param } of paramSources) {
    if (pathName.includes(path)) {
      extractedParam = typeof param === "function" ? param(queryParams) : queryParams.get(param) || "";
      break;
    }
  }

  if (!extractedParam) {
    extractedParam = queryParams.get("sys_id") || queryParams.get("sysparm_query") || "";
  }

  return { path: pathName, param: extractedParam };
}
