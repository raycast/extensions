import { unlink } from "node:fs/promises";

import { Action, Icon, Toast, showToast, getPreferenceValues } from "@raycast/api";

import { addEntryToLibraryFromPdfWithToast } from "./add_to_library";
import { AdsQueryBibtex, AdsQueryPdf } from "./queries";
import { showError } from "./errors";
import { isBibFile } from "./preferences";

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
        if (!isBibFile(prefs.bibfile)) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Not a .bib file",
            message: "Select your BibTeX file in the extension settings.",
          });
          return;
        }

        let tmpPdfPath: string | null = null;

        try {
          await showToast({ style: Toast.Style.Animated, title: "Fetching BibTeX…" });
          const bibtexRaw = await AdsQueryBibtex(bibcode, api_token);

          await showToast({ style: Toast.Style.Animated, title: "Downloading PDF…" });
          tmpPdfPath = await AdsQueryPdf(bibcode, api_token);

          await addEntryToLibraryFromPdfWithToast({
            pdfPath: tmpPdfPath,
            bibtexRaw,
            path: prefs.path,
            bibfile: prefs.bibfile,
          });

          onAdded?.();
        } catch (e) {
          await showError(e, "Could not add to library");
        } finally {
          if (tmpPdfPath) {
            await unlink(tmpPdfPath).catch(() => {});
          }
        }
      }}
    />
  );
}
