import { timeoutSignal } from "./constants";
import { Validators } from "./types";

export interface Fetched {
  body: string;
  validators: Validators;
}

function validatorsOf(response: Response): Validators {
  const validators: Validators = {};
  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");
  if (etag) validators.etag = etag;
  if (lastModified) validators.lastModified = lastModified;
  return validators;
}

export function revisionOf(validators: (Validators | undefined)[]): string {
  const parts = validators.map(
    (item) => item?.etag ?? item?.lastModified ?? "",
  );
  return parts.every(Boolean) ? parts.join(" ") : "";
}

// Both hosts answer a conditional request with 304 and no body, so an unchanged
// file costs one round trip instead of a download. null means "still current".
export async function fetchIfChanged(
  url: string,
  previous?: Validators,
): Promise<Fetched | null> {
  const headers: Record<string, string> = {};
  if (previous?.etag) headers["If-None-Match"] = previous.etag;
  if (previous?.lastModified)
    headers["If-Modified-Since"] = previous.lastModified;

  const response = await fetch(url, { headers, signal: timeoutSignal() });
  if (response.status === 304 && Object.keys(headers).length > 0) return null;
  if (!response.ok)
    throw new Error(`Failed to load ${url} (HTTP ${response.status})`);
  return { body: await response.text(), validators: validatorsOf(response) };
}

export async function fetchText(url: string): Promise<Fetched> {
  const fetched = await fetchIfChanged(url);
  if (!fetched) throw new Error(`Failed to load ${url}`);
  return fetched;
}
