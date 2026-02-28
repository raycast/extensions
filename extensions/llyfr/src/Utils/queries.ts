import os from "node:os";
import Path from "node:path";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";

import { type IAdsGeneralQueryEntry, type IAdsDocEntry } from "./types";

/**
 * Performs a general query against the ADS database and retrieves relevant entries.
 * @param {string} query - The query string to search for in the ADS database.
 * @param {string} ads_api_token - The API token for authenticating with the ADS API.
 * @returns {Promise<IAdsGeneralQueryEntry[]>} - A promise that resolves to an array of ADS query results.
 * @throws {Error} - Throws an error if the ADS query fails or if the response is not in the expected format.
 */
export async function AdsQueryGeneral(query: string, ads_api_token: string): Promise<IAdsGeneralQueryEntry[]> {
  const url = new URL("https://api.adsabs.harvard.edu/v1/search/query");
  url.searchParams.set("q", query);
  url.searchParams.set("fl", "bibcode,title,author,year");
  url.searchParams.set("rows", "50");

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${ads_api_token}` },
  });

  if (!resp.ok) {
    throw new Error(`ADS HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as { response?: { docs?: IAdsGeneralQueryEntry[] } };
  return data.response?.docs ?? [];
}

/**
 * Fetch a specific document from ADS with a bibcode
 * @param {string} bibcode - Bibcode of the document.
 * @param {string} token - The API token for authenticating with the ADS API.
 * @returns {Promise<IAdsDocEntry>} - A promise that resolves to the ADS document entry.
 * @throws {Error} - Throws an error if the ADS query fails or if the document info is not found.
 */
export async function AdsQueryByBibcode(bibcode: string, token: string): Promise<IAdsDocEntry> {
  const url = new URL("https://api.adsabs.harvard.edu/v1/search/query");
  url.searchParams.set("q", `bibcode:"${bibcode}"`);
  url.searchParams.set("fl", "bibcode,title,author,year,pub,abstract,doi");
  url.searchParams.set("rows", "1");

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new Error(`ADS query HTTP ${resp.status}`);
  }

  const data = (await resp.json()) as { response?: { docs?: unknown[] } };
  const doc = data?.response?.docs?.[0];
  if (!doc) {
    throw new Error("No ADS record found");
  }
  return doc as IAdsDocEntry;
}

/**
 * Receives a specific ADS entry as BibTeX.
 * @param {string} bibcode - The bibcode of the entry to export as BibTeX.
 * @param {string} api_token - The API token for authenticating with the ADS API.
 * @returns {Promise<string>} - A promise that resolves to the BibTeX representation of the ADS entry.
 * @throws {Error} - Throws an error if the BibTeX export fails or if no BibTeX is returned from ADS.
 */
export async function AdsQueryBibtex(bibcode: string, api_token: string): Promise<string> {
  const resp = await fetch("https://api.adsabs.harvard.edu/v1/export/bibtex", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bibcode: [bibcode] }),
  });

  if (!resp.ok) {
    throw new Error(`ADS BibTeX export failed (HTTP ${resp.status})`);
  }

  const data = await resp.json();
  const bibtex = String((data as { export?: string })?.export ?? "").trim();
  if (!bibtex) {
    throw new Error("No BibTeX returned from ADS");
  }
  return bibtex;
}

/**
 * Downloads the PDF of a specific ADS entry, trying both EPRINT_PDF and PUB_PDF endpoints.
 * @param {string} bibcode - The bibcode of the entry to download as PDF.
 * @param {string} api_token - The API token for authenticating with the ADS API.
 * @returns {Promise<string>} - A promise that resolves to the file path of the downloaded PDF.
 * @throws {Error} - Throws an error if the PDF cannot be downloaded from ADS.
 */
export async function AdsQueryPdf(bibcode: string, api_token: string): Promise<string> {
  const candidates = ["EPRINT_PDF", "PUB_PDF"] as const;

  const tmpPath = Path.join(os.tmpdir(), `llyfr_${bibcode}_${Date.now()}.pdf`);

  for (const endpoint of candidates) {
    const url = `https://ui.adsabs.harvard.edu/link_gateway/${encodeURIComponent(bibcode)}/${endpoint}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${api_token}` },
      redirect: "follow", // the equivalent of curl -L
    });

    if (!resp.ok || !resp.body) {
      // try next endpoint
      continue;
    }

    // Stream to disk (avoids loading whole PDF into memory)
    const fileStream = createWriteStream(tmpPath);
    const body = Readable.fromWeb(resp.body as ReadableStream);
    await pipeline(body, fileStream);

    // Basic sanity check: sometimes PUB_PDF may return HTML/paywall.
    // If it's clearly not a PDF, try the other endpoint.
    const ct = resp.headers.get("content-type")?.toLowerCase() ?? "";
    if (ct.includes("text/html")) {
      await unlink(tmpPath).catch(() => {});
      continue;
    }

    return tmpPath;
  }

  // if we get here, both attempts failed
  throw new Error("Could not download PDF from ADS (EPRINT_PDF and PUB_PDF both failed)");
}
