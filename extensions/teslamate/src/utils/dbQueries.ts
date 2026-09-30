import { tmGrafanaUrl, dataSourceUuid, saToken } from "./constants";

export const baseApiConfig = {
  url: tmGrafanaUrl,
  method: "POST",
  headers: {
    accept: "application/json",
    Authorization: "Bearer " + saToken,
    "Content-Type": "application/json",
  },
};

export const baseApiBody = (rawSqlQueries: { rawSql: string; refId: string }[]) => {
  const queries = rawSqlQueries.map(({ rawSql, refId }) => ({
    datasource: { uid: dataSourceUuid },
    format: "table",
    intervalMs: 86400000,
    rawSql: rawSql,
    refId: refId,
  }));

  return {
    from: "now-1h",
    queries: queries,
    to: "now",
  };
};
