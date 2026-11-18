import type { Connection } from "./connections";
import type { HttpMethod } from "./client";
import { joinUrl } from "./client";

export function prettyJson(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 2);
}

export function rawJson(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** A runnable curl command reproducing the request, including auth. */
export function toCurl(connection: Connection, method: HttpMethod, path: string, body?: string): string {
  const url = joinUrl(connection.url, path);
  const parts = [`curl -X ${method} ${shellQuote(url)}`];

  if (connection.ignoreCerts) parts.push("-k");

  if (connection.auth === "basic" && connection.username) {
    parts.push(`-u ${shellQuote(`${connection.username}:${connection.password ?? ""}`)}`);
  } else if (connection.auth === "sigv4") {
    parts.push(`--aws-sigv4 ${shellQuote(`aws:amz:${connection.awsRegion ?? ""}:${connection.awsService ?? "es"}`)}`);
    parts.push(`-u ${shellQuote(`${connection.awsAccessKeyId ?? ""}:${connection.awsSecretAccessKey ?? ""}`)}`);
    if (connection.awsSessionToken) {
      parts.push(`-H ${shellQuote(`x-amz-security-token: ${connection.awsSessionToken}`)}`);
    }
  }

  if (body) {
    parts.push(`-H ${shellQuote("Content-Type: application/json")}`);
    parts.push(`-d ${shellQuote(body)}`);
  }

  return parts.join(" \\\n  ");
}

/** OpenSearch Dashboards Dev Tools console format, e.g. `GET /_cluster/health`. */
export function toDevToolsConsole(method: HttpMethod, path: string, body?: string): string {
  const header = `${method} ${path}`;
  if (!body) return header;
  let pretty = body;
  try {
    pretty = JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    // keep the body as-is when it isn't valid JSON
  }
  return `${header}\n${pretty}`;
}
