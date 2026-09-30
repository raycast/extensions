import { BrowserExtension, environment } from "@raycast/api";

import type { ResolvedDomain } from "../types";

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

export function normalizeDomain(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Enter a domain or URL.");
  }

  let url: URL;

  try {
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
      url = new URL(trimmed);
    } else {
      url = new URL(`https://${trimmed}`);
    }
  } catch {
    throw new Error(`Could not parse \`${trimmed}\` as a domain or URL.`);
  }

  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const hostname = stripCommonSubdomain(url.hostname);

  if (!isValidHostname(hostname)) {
    throw new Error(`\`${trimmed}\` is not a valid domain.`);
  }

  return hostname;
}

export async function resolveDomain(input?: string): Promise<ResolvedDomain> {
  if (input?.trim()) {
    return {
      domain: normalizeDomain(input),
      source: "argument",
    };
  }

  return resolveDomainFromActiveTab();
}

async function resolveDomainFromActiveTab(): Promise<ResolvedDomain> {
  if (!environment.canAccess(BrowserExtension)) {
    throw new Error(
      "Enter a domain or install and enable the Raycast browser extension to use the active-tab fallback.",
    );
  }

  let tabs: BrowserExtension.Tab[];

  try {
    tabs = await BrowserExtension.getTabs();
  } catch {
    throw new Error(
      "Raycast could not read your browser tabs. Enter a domain manually or try again after enabling the browser extension.",
    );
  }

  const activeTab = tabs.find((tab) => tab.active);

  if (!activeTab) {
    throw new Error("No active browser tab was found. Enter a domain manually.");
  }

  return {
    domain: normalizeDomain(activeTab.url),
    source: "active-tab",
  };
}

function stripCommonSubdomain(hostname: string): string {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");

  if (normalized.startsWith("www.")) {
    return normalized.slice(4);
  }

  return normalized;
}

function isValidHostname(value: string): boolean {
  if (!value || value.length > 253 || !value.includes(".")) {
    return false;
  }

  const labels = value.split(".");

  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    return false;
  }

  if (labels.some((label) => label.startsWith("-") || label.endsWith("-"))) {
    return false;
  }

  if (labels.some((label) => !/^[a-z\d-]+$/i.test(label))) {
    return false;
  }

  const topLevelLabel = labels[labels.length - 1];
  return /^[a-z]{2,63}$/i.test(topLevelLabel);
}
