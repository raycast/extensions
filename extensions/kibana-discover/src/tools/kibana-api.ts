import https from "https";
import http from "http";
import type { KibanaInstance, DataView } from "../types";

/**
 * Build authentication headers for Kibana API requests
 */
export function buildAuthHeaders(
  instance: KibanaInstance,
): Record<string, string> {
  const headers: Record<string, string> = {
    "kbn-xsrf": "true",
    "Content-Type": "application/json",
  };

  if (instance.apiKey) {
    headers["Authorization"] = `ApiKey ${instance.apiKey}`;
  } else if (instance.username && instance.password) {
    const auth = Buffer.from(
      `${instance.username}:${instance.password}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${auth}`;
  }

  return headers;
}

/**
 * Fetch data views from Kibana using the modern API
 */
export async function fetchDataViews(
  kibanaUrl: string,
  headers: Record<string, string>,
): Promise<DataView[]> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${kibanaUrl}/api/data_views`);
    const protocol = url.protocol === "https:" ? https : http;

    const options = {
      headers,
      rejectUnauthorized: false,
    };

    protocol
      .get(url.toString(), options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              const dataViews = result.data_view || result.index_pattern || [];
              const normalized = dataViews.map((view: DataView) => ({
                id: view.id,
                attributes: {
                  title: view.title,
                  name: view.name,
                },
              }));
              resolve(normalized);
            } else if (res.statusCode === 404) {
              fetchDataViewsLegacy(kibanaUrl, headers)
                .then(resolve)
                .catch(reject);
            } else {
              reject(
                new Error(`API returned status ${res.statusCode}: ${data}`),
              );
            }
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Fetch data views from Kibana using the legacy API (for older Kibana versions)
 */
export async function fetchDataViewsLegacy(
  kibanaUrl: string,
  headers: Record<string, string>,
): Promise<DataView[]> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${kibanaUrl}/api/saved_objects/_find`);
    url.searchParams.append("type", "index-pattern");
    url.searchParams.append("per_page", "1000");
    url.searchParams.append("fields", "title");
    url.searchParams.append("fields", "name");

    const protocol = url.protocol === "https:" ? https : http;

    const options = {
      headers,
      rejectUnauthorized: false,
    };

    protocol
      .get(url.toString(), options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              const result = JSON.parse(data);
              resolve(result.saved_objects || []);
            } else {
              reject(
                new Error(`API returned status ${res.statusCode}: ${data}`),
              );
            }
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}
