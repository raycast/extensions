import { APIOperation } from "../types/api";
import { environment } from "@raycast/api";
import https from "https";

interface APISearchResponse {
  code: number;
  data: {
    total: number;
    page: number;
    perPage: number;
    pages: number;
    list: APISearchItem[];
  };
}

interface APISearchItem {
  api: string;
  title: string;
  product: string;
  product_name: string;
  version: string;
  search_summary: string;
}

async function fetchPage(keyword: string, page: number): Promise<APISearchResponse> {
  const params = new URLSearchParams({
    query: keyword,
    query_type: "direct",
    biz: "workbench_top_bar",
    page: page.toString(),
    perPage: "20", // Increased page size
    guess_tab: "0",
  });

  const url = `https://api.aliyun.com/api/search/api?${params.toString()}`;
  console.log(`Requesting page ${page}, URL:`, url);

  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Raycast-Aliyun-Extension",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            try {
              const parsedData = JSON.parse(data);
              resolve(parsedData);
            } catch (e: Error) {
              reject(new Error(`Invalid JSON response: ${e.message}`));
            }
          });
        },
      )
      .on("error", reject);
  });
}

export async function searchAPIs(keyword: string): Promise<APIOperation[]> {
  try {
    // Get first page to determine total pages
    const firstPage = await fetchPage(keyword, 1);

    if (!firstPage?.data) {
      console.log("Invalid response data:", firstPage);
      return [];
    }

    const { pages, list } = firstPage.data;
    let allResults = [...list];

    // If multiple pages exist, fetch remaining pages in parallel
    if (pages > 1) {
      const remainingPages = Array.from({ length: pages - 1 }, (_, i) => i + 2);
      const pagePromises = remainingPages.map((page) => fetchPage(keyword, page));

      try {
        const results = await Promise.all(pagePromises);
        results.forEach((result) => {
          if (result?.data?.list) {
            allResults = allResults.concat(result.data.list);
          }
        });
      } catch (error: Error) {
        console.error("Failed to fetch additional pages:", error);
      }
    }

    // Convert API data format
    const results = allResults.map((item: APISearchItem) => ({
      name: item.api || "",
      description: item.title || "",
      product: item.product || "",
      productName: item.product_name || "",
      version: item.version || "",
      apiPath: item.api || "",
      summary: item.search_summary || "",
    }));

    console.log(`Total APIs found: ${results.length}`);
    return results;
  } catch (error: Error) {
    console.error("API search failed:", error);
    if (environment.isDevelopment) {
      console.log("Development environment details:", {
        launchType: environment.launchType,
        error: error.toString(),
        stack: error.stack,
      });
    }
    return [];
  }
}
