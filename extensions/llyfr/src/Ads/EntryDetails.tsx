import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { describeError, showError } from "../Utils/errors";
import { type IRemoteEntryDetails } from "../Utils/types";
import { AdsQueryByBibcode, AdsQueryBibtex } from "../Utils/queries";
import { Icons } from "../Utils/icons";
import EntryDetails from "../Utils/EntryDetails";

const toYear = (y?: string): number => {
  const n = Number.parseInt(y ?? "", 10);
  return Number.isFinite(n) ? n : -1;
};

async function loadRemoteEntry(bibcode: string, api_token: string): Promise<IRemoteEntryDetails> {
  const [doc, bibtex] = await Promise.all([AdsQueryByBibcode(bibcode, api_token), AdsQueryBibtex(bibcode, api_token)]);
  return {
    title: doc.title?.[0] ?? bibcode,
    authors: doc.author ?? [],
    year: toYear(doc.year),
    journal: doc.pub,
    abstract: doc.abstract,
    url: `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`,
    bibcode,
    bibtex,
  };
}

export default function RemoteEntryDetails({
  bibcode,
  api_token,
  path,
}: {
  bibcode: string;
  api_token: string;
  path?: string;
}) {
  const {
    isLoading,
    data: entry,
    error,
    revalidate,
  } = usePromise(loadRemoteEntry, [bibcode, api_token], {
    onError: (e) => showError(e, "Could not load details"),
  });

  if (entry) {
    return <EntryDetails entry={entry} remote={true} api_token={api_token} path={path} />;
  }

  if (!isLoading && error) {
    return (
      <Detail
        markdown={`# Could not load details\n\n${describeError(error)}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action.OpenInBrowser
              title="Open in ADS"
              icon={Icons.Globe}
              url={`https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail isLoading markdown=" " />;
}
