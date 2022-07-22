import fetch from "node-fetch";
import { AllIncidents, PageStatus, Summary } from "./types";

export function getStatus(id: string) {
  return fetch(`https://${id}.statuspage.io/api/v2/status.json`).then((r) => r.json()) as Promise<PageStatus>;
}

export function getStatusFromOrgin(orgin: string) {
  return fetch(orgin + "/api/v2/status.json").then((r) => r.json()) as Promise<PageStatus>;
}

export function getSummary(id: string) {
  return fetch(`https://${id}.statuspage.io/api/v2/summary.json`).then((r) => r.json()) as Promise<Summary>;
}

export function getAllIncidents(id: string) {
  return fetch(`https://${id}.statuspage.io/api/v2/incidents.json`).then((r) => r.json()) as Promise<AllIncidents>;
}

export async function getFavicon(id: string) {
  const body = (await fetch(`https://${id}.statuspage.io/api`)
    .then((r) => r.text())
    .catch(() => null)) as string | null;
  if (!body) return;

  const linkRegex = /<link (.*)>/gi,
    relRegex = /rel=["'][^"]*icon[^"']*["']/i,
    hrefRegex = /href=["']([^"']*)["']/i;

  const linkMatch = linkRegex.exec(body);
  if (!linkMatch?.[1]) return;
  if (relRegex.test(linkMatch[1])) {
    return hrefRegex.exec(linkMatch[1])?.[1];
  }
}
