import os from "node:os";
import Path from "node:path";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { open, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ReadableStream } from "node:stream/web";

import { describeError } from "./errors";
import { httpFetch } from "./http";
import { type IAdsGeneralQueryEntry, type IAdsDocEntry } from "./types";

/** ADS refused the request because of the API token (HTTP 401 or 403). */
export class AdsTokenError extends Error {
  constructor(status: number) {
    super(
      `ADS rejected the API token (HTTP ${status}). Check the ADS API Token in the extension settings (under Search ADS).`,
    );
    this.name = "AdsTokenError";
  }
}

/** An error for a failed ADS API request, pointing to the token when ADS rejects it. */
function adsHttpError(status: number, what: string): Error {
  if (status === 401 || status === 403) {
    return new AdsTokenError(status);
  }
  return new Error(`${what} failed (HTTP ${status})`);
}

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

  const resp = await httpFetch(url.toString(), {
    headers: { Authorization: `Bearer ${ads_api_token}` },
  });

  if (!resp.ok) {
    throw adsHttpError(resp.status, "ADS search");
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

  const resp = await httpFetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw adsHttpError(resp.status, "ADS query");
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
  const resp = await httpFetch("https://api.adsabs.harvard.edu/v1/export/bibtex", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bibcode: [bibcode] }),
  });

  if (!resp.ok) {
    throw adsHttpError(resp.status, "ADS BibTeX export");
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
  // arXiv version first, then the publisher's.
  const candidates = ["EPRINT_PDF", "PUB_PDF"] as const;
  const failures: string[] = [];

  for (const endpoint of candidates) {
    const url = `https://ui.adsabs.harvard.edu/link_gateway/${encodeURIComponent(bibcode)}/${endpoint}`;
    const tmpPath = Path.join(os.tmpdir(), `llyfr_${randomUUID()}.pdf`);

    try {
      const resp = await httpFetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${api_token}` },
        redirect: "follow",
      });
      if (!resp.ok || !resp.body) {
        await resp.body?.cancel().catch(() => {});
        failures.push(`${endpoint}: HTTP ${resp.status}`);
        continue;
      }

      // Stream to disk (avoids loading the whole PDF into memory).
      await pipeline(Readable.fromWeb(resp.body as ReadableStream), createWriteStream(tmpPath));

      // Paywalls and error pages come back as HTML (or anything else) with HTTP 200.
      if (!(await isPdf(tmpPath))) {
        await unlink(tmpPath).catch(() => {});
        failures.push(`${endpoint}: not a PDF`);
        continue;
      }
      return tmpPath;
    } catch (e) {
      await unlink(tmpPath).catch(() => {});
      failures.push(`${endpoint}: ${describeError(e)}`);
    }
  }

  throw new Error(`Could not download the PDF from ADS (${failures.join("; ")})`);
}

/** PDF files start with `%PDF-`, possibly after a few bytes of junk. */
async function isPdf(file: string): Promise<boolean> {
  const handle = await open(file, "r");
  try {
    const head = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    return head.subarray(0, bytesRead).includes("%PDF-");
  } finally {
    await handle.close();
  }
}
