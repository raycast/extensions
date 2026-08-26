import https from "node:https";

/**
 * Minimal HTTP client for the Raycast extension sandbox.
 *
 * The sandbox does NOT expose the global `fetch` (verified on-device:
 * `typeof fetch === "undefined"`), so all requests use Node's built-in
 * `https` module, which is always available.
 */
export interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  text: string;
}

export async function httpRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: string,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: `${u.pathname}${u.search}`,
        headers,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, headers: res.headers, text: data });
        });
      },
    );
    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}
