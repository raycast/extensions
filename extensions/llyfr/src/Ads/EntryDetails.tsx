import { useState, useEffect } from "react";
import { Detail, Toast, showToast } from "@raycast/api";

import { type IRemoteEntryDetails } from "../Utils/types";
import { AdsQueryByBibcode, AdsQueryBibtex } from "../Utils/queries";
import EntryDetails from "../Utils/EntryDetails";

export default function RemoteEntryDetails({
  bibcode,
  api_token,
  path,
}: {
  bibcode: string;
  api_token: string;
  path?: string;
}) {
  const [entry, setEntry] = useState<IRemoteEntryDetails | null>(null);

  const ensureNumberYear = (y?: string): number => {
    const n = Number.parseInt(y ?? "", 10);
    return Number.isFinite(n) ? n : -1;
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Loading ADS details..." });

        const [doc, bibtex] = await Promise.all([
          AdsQueryByBibcode(bibcode, api_token),
          AdsQueryBibtex(bibcode, api_token),
        ]);

        const e: IRemoteEntryDetails = {
          title: doc.title?.[0] ?? bibcode,
          authors: doc.author ?? [],
          year: ensureNumberYear(doc.year),
          journal: doc.pub,
          abstract: doc.abstract,
          url: `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`,
          bibcode,
          bibtex,
        };

        if (!cancelled) {
          setEntry(e);
        }
        await showToast({ style: Toast.Style.Success, title: "Loaded" });
      } catch (err) {
        if (!cancelled) {
          await showToast({ style: Toast.Style.Failure, title: "Failed to load details", message: String(err) });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bibcode, api_token]);

  if (!entry) {
    return <Detail isLoading markdown=" " />;
  }
  return <EntryDetails entry={entry} remote={true} api_token={api_token} path={path} />;
}
