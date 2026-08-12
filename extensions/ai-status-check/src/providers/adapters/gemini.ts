import { deriveProviderHealth } from "../../domain/derive-health";
import type { Health } from "../../domain/types";
import { geminiComponents, parseGeminiBootConfig, parseGeminiIncidents } from "../parsers/gemini";
import { fetchJson, fetchText, type FetchJson, type FetchText } from "../utils/http";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";

export interface GeminiAdapterConfig extends ProviderAdapterConfig {
  rpcPath?: string;
  requestInit?: RequestInit;
  fetchText?: FetchText;
  fetchJson?: FetchJson;
}

export function createGeminiAdapter(config: GeminiAdapterConfig): ProviderAdapter {
  const requestPage = config.fetchText ?? fetchText;
  const requestRpc = config.fetchJson ?? fetchJson;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const page = await requestPage(config.statusPageUrl, signal);
      const { apiKey, rpcBase } = parseGeminiBootConfig(page);
      const payload = await requestRpc(
        `${rpcBase}${config.rpcPath ?? "/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/ListIncidentsHistory"}`,
        signal,
        {
          ...config.requestInit,
          method: "POST",
          headers: {
            "Content-Type": "application/json+protobuf",
            "X-Goog-Api-Key": apiKey,
            "X-User-Agent": "grpc-web-javascript/0.1",
            Origin: "https://aistudio.google.com",
            Referer: "https://aistudio.google.com/",
            ...config.requestInit?.headers,
          },
          body: config.requestInit?.body ?? "[]",
        },
      );
      const incidents = parseGeminiIncidents(payload, config.statusPageUrl);
      const components = geminiComponents(incidents);
      const reportedHealth: Health = incidents.some((incident) => incident.state !== "resolved")
        ? "unknown"
        : "operational";

      return {
        providerId: config.providerId,
        health: deriveProviderHealth(reportedHealth, components, incidents),
        components,
        incidents,
        fetchedAt: now().toISOString(),
      };
    },
  };
}
