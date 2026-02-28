import { Action, Icon, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { type ReadableStream } from "node:stream/web";
import os from "node:os";
import Path from "node:path";

import { addEntryToLibraryFromPdfWithToast } from "./add_to_library";

type Preferences = {
  path: string; // library directory
  bibfile: string; // full path to .bib file
};

async function fetchBibtexFromADS(bibcode: string, api_token: string): Promise<string> {
  const resp = await fetch("https://api.adsabs.harvard.edu/v1/export/bibtex", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bibcode: [bibcode] }),
  });

  if (!resp.ok) throw new Error(`ADS BibTeX export failed (HTTP ${resp.status})`);

  const data = await resp.json();
  const bibtex = String((data as { export?: string })?.export ?? "").trim();
  if (!bibtex) throw new Error("No BibTeX returned from ADS");
  return bibtex;
}

async function downloadPdfFromADS(bibcode: string, api_token: string): Promise<string> {
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

export default function DownloadAction({
  bibcode,
  api_token,
  onAdded,
}: {
  bibcode: string;
  api_token: string;
  onAdded?: () => void;
}) {
  return (
    <Action
      icon={Icon.Download}
      title="Add to Library"
      onAction={async () => {
        const prefs = getPreferenceValues<Preferences>();
        if (!prefs.path || !prefs.bibfile) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Missing preferences",
            message: "Set path and bibfile first.",
          });
          return;
        }

        let tmpPdfPath: string | null = null;

        try {
          await showToast({ style: Toast.Style.Animated, title: "Fetching BibTeX…" });
          const bibtexRaw = await fetchBibtexFromADS(bibcode, api_token);

          await showToast({ style: Toast.Style.Animated, title: "Downloading PDF…" });
          tmpPdfPath = await downloadPdfFromADS(bibcode, api_token);

          await addEntryToLibraryFromPdfWithToast({
            pdfPath: tmpPdfPath,
            bibtexRaw,
            path: prefs.path,
            bibfile: prefs.bibfile,
          });

          onAdded?.();
        } catch (e) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not add to library",
            message: String(e),
          });
        } finally {
          if (tmpPdfPath) {
            await unlink(tmpPdfPath).catch(() => {});
          }
        }
      }}
    />
  );
}
