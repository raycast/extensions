import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { useFetchSite } from "../hooks/useFetchSite";
import { urlFromInput } from "../utils/urlText";
import { validateUrl } from "../utils/urlUtils";
import { DataFeedsAPI } from "./DataFeedsAPI";
import { Discoverability } from "./Discoverability";
import { DNSCertificates } from "./DNSCertificates";
import { ErrorDisplay } from "./ErrorDisplay";
import { HTTPHeaders } from "./HTTPHeaders";
import { MetadataSemantics } from "./MetadataSemantics";
import { Overview } from "./Overview";
import { ResourcesAssets } from "./ResourcesAssets";
import { Theme } from "./Theme";
import { WaybackMachine } from "./WaybackMachine";
import { WellKnown } from "./WellKnown";

/** One dig: the sections for a URL already resolved by whichever command started it. */
export function DigResults({ url: initialUrl }: { url: string }) {
  // The URL can change after mount: from the error view, a corrected URL is dug
  // in place of the one that failed.
  const [url, setUrl] = useState(initialUrl);
  // The error view's search bar, which starts out showing the URL that failed.
  const [searchText, setSearchText] = useState(initialUrl);
  const { data, isLoading, error, errorType, fetchErrors, fetchSite, refetch, certificateInfo, progress } =
    useFetchSite(url);

  useEffect(() => {
    if (url && validateUrl(url)) {
      fetchSite(url);
    }
  }, [url]);

  // Check if we have partial data (some sections loaded successfully)
  const hasPartialData = !!(data && (data.overview || data.metadata || data.networking));

  // Show full error state only if we have no partial data.
  //
  // Deliberately a BARE List: no `isShowingDetail`. The two-pane layout exists to
  // put a detail beside a selection, and an empty state has neither — keeping it
  // reserved an empty half-window next to a centered message.
  if (error && !hasPartialData) {
    const edited = searchText.trim() !== url ? searchText.trim() : "";
    return (
      <List searchText={searchText} onSearchTextChange={setSearchText} searchBarPlaceholder="Type a URL to dig">
        <ErrorDisplay
          error={error}
          errorType={errorType}
          fetchErrors={fetchErrors}
          onRetry={refetch}
          url={url}
          edited={edited ? { text: edited, url: urlFromInput(edited) } : undefined}
          onDig={(next) => {
            setUrl(next);
            setSearchText(next);
          }}
        />
      </List>
    );
  }

  // Calculate overall progress as average of all categories
  const overallProgress =
    (progress.overview +
      progress.metadata +
      progress.discoverability +
      progress.resources +
      progress.networking +
      progress.dns +
      progress.history +
      progress.dataFeeds) /
    8;

  return (
    <List isLoading={isLoading} isShowingDetail>
      <Overview data={data} onRefresh={refetch} overallProgress={overallProgress} />
      <MetadataSemantics data={data} onRefresh={refetch} progress={progress.metadata} />
      <Discoverability data={data} onRefresh={refetch} progress={progress.discoverability} />
      <WellKnown data={data} onRefresh={refetch} progress={progress.wellKnown} />
      <ResourcesAssets data={data} onRefresh={refetch} progress={progress.resources} />
      <Theme data={data} onRefresh={refetch} progress={progress.theme} />
      <HTTPHeaders data={data} onRefresh={refetch} progress={progress.networking} />
      <DNSCertificates data={data} onRefresh={refetch} certificateInfo={certificateInfo} progress={progress.dns} />
      <DataFeedsAPI data={data} onRefresh={refetch} progress={progress.dataFeeds} />
      <WaybackMachine data={data} onRefresh={refetch} progress={progress.history} />
    </List>
  );
}
