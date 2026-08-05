import http from "node:http";
import https from "node:https";
import { createLog } from "../lib/debug";
import { AbortedError } from "../lib/aborted";
const log = createLog("request");

type REQUEST_METHOD = "GET" | "HEAD";

export const DEFAULT_TIMEOUT = 5000;

interface ApiResponse<T = ""> {
  headers: http.IncomingHttpHeaders;
  data: T;
  /**
   * True if the status code is 200
   */
  ok: boolean;
  status: number;
}

type RequestOptions = Omit<http.RequestOptions, "protocol" | "hostname" | "port" | "path" | "method">;

function request<T>(
  url: string,
  method: REQUEST_METHOD = "GET",
  params?: Record<string, string>,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const signal = options?.signal;

    if (signal?.aborted) {
      reject(new AbortedError());

      return;
    }

    const isSecure = url.startsWith("https://");
    const queryParams = params ? `?${new URLSearchParams(params).toString()}` : "";
    const requestFn = isSecure ? https.request : http.request;

    log.log(`[${method}] request to: ${url}${queryParams}`);
    const httpsOptions = options?.agent ? { agent: options.agent } : {};

    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      signal?.removeEventListener("abort", onAbort);
      callback();
    };

    const req = requestFn(
      `${url}${queryParams}`,
      {
        method,
        timeout: DEFAULT_TIMEOUT,
        ...httpsOptions,
        ...options,
      },
      (res) => {
        let responseString = "";

        res
          .on("data", (chunk) => {
            responseString += chunk;
          })
          .on("end", () => {
            let parsedData: T | string;

            try {
              parsedData = JSON.parse(responseString) as T;
            } catch {
              parsedData = responseString;
            }

            finish(() =>
              resolve({
                headers: res.headers,
                data: parsedData as T,
                ok: res.statusCode === 200,
                status: res.statusCode || 0,
              }),
            );
          });
      },
    );

    const onAbort = () => {
      req.destroy();
      finish(() => reject(new AbortedError()));
    };

    signal?.addEventListener("abort", onAbort);

    req
      .on("error", (error) => {
        log.log(`Request ${url}${queryParams} failed`);
        console.error(error);
        finish(() => reject(error));
      })
      .on("timeout", () => {
        req.destroy();
        finish(() => reject(new Error("Request timeout")));
      });

    req.end();
  });
}

export async function get<T>(
  url: string,
  params?: Record<string, string>,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  return request<T>(url, "GET", params, options);
}

export async function head(
  url: string,
  params?: Record<string, string>,
  options?: RequestOptions,
): Promise<ApiResponse<undefined>> {
  return request<undefined>(url, "HEAD", params, options);
}
