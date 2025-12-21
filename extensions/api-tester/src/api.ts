import fetch from "node-fetch";
import FormData from "form-data";
import { createReadStream } from "fs";
import { basename } from "path";
import { ApiRequest, ApiResponse } from "./types";
import { replaceVariables, buildQueryString } from "./utils";

export async function sendRequest(
  request: ApiRequest,
  timeout = 30000,
): Promise<ApiResponse> {
  const startTime = Date.now();

  try {
    // Replace variables in URL
    let url = await replaceVariables(request.url);

    // Add query parameters
    const enabledParams = request.queryParams.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const queryString = buildQueryString(enabledParams);
      url = url.includes("?")
        ? `${url}&${queryString.slice(1)}`
        : `${url}${queryString}`;
    }

    // Build headers
    const headers: Record<string, string> = {};

    // Add custom headers
    for (const header of request.headers.filter((h) => h.enabled && h.key)) {
      headers[header.key] = await replaceVariables(header.value);
    }

    // Add auth headers
    if (request.auth.type === "bearer" && request.auth.bearer) {
      headers["Authorization"] =
        `Bearer ${await replaceVariables(request.auth.bearer.token)}`;
    } else if (request.auth.type === "apikey" && request.auth.apikey) {
      if (request.auth.apikey.addTo === "header") {
        headers[request.auth.apikey.key] = await replaceVariables(
          request.auth.apikey.value,
        );
      } else {
        // Add to query string
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}${encodeURIComponent(request.auth.apikey.key)}=${encodeURIComponent(
          await replaceVariables(request.auth.apikey.value),
        )}`;
      }
    } else if (request.auth.type === "basic" && request.auth.basic) {
      const credentials = Buffer.from(
        `${await replaceVariables(request.auth.basic.username)}:${await replaceVariables(request.auth.basic.password)}`,
      ).toString("base64");
      headers["Authorization"] = `Basic ${credentials}`;
    }

    // Build body
    let body: string | FormData | undefined;
    if (request.method !== "GET" && request.body.type !== "none") {
      if (request.body.type === "json" && request.body.json) {
        headers["Content-Type"] = "application/json";
        body = await replaceVariables(request.body.json);
      } else if (request.body.type === "form-data" && request.body.formData) {
        const formData = new FormData();
        const params = request.body.formData.filter((p) => p.enabled && p.key);

        for (const param of params) {
          if (param.type === "file" && param.filePath) {
            // Handle file upload
            try {
              const filePath = await replaceVariables(param.filePath);
              const fileStream = createReadStream(filePath);
              const fileName = basename(filePath);
              formData.append(param.key, fileStream, fileName);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              throw new Error(
                `Failed to read file for field "${param.key}": ${errorMessage}`,
              );
            }
          } else {
            // Handle text field
            formData.append(param.key, await replaceVariables(param.value));
          }
        }

        body = formData;
        // FormData sets its own Content-Type with boundary
        Object.assign(headers, formData.getHeaders());
      } else if (
        request.body.type === "x-www-form-urlencoded" &&
        request.body.urlEncoded
      ) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        const params = request.body.urlEncoded.filter(
          (p) => p.enabled && p.key,
        );
        body = params
          .map(
            (p) =>
              `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
          )
          .join("&");
      } else if (request.body.type === "raw" && request.body.raw) {
        body = await replaceVariables(request.body.raw);
      }
    }

    // Send request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const size = Buffer.byteLength(responseBody, "utf8");

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      responseTime,
      size,
      actualUrl: url, // Include the actual URL that was sent
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Request failed: ${errorMessage}`);
  }
}
