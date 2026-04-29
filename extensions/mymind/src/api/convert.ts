import { api } from "./client";

export type ConvertFormat = "text/plain" | "text/markdown" | "application/prose+json";

export async function convert(body: string, from: ConvertFormat, to: ConvertFormat): Promise<string> {
  const response = await api.postRaw("/convert", body, {
    contentType: from,
    accept: to,
  });
  return response.text();
}
