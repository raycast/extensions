import { useEffect, useState } from "react";
import { BrowserExtension, Clipboard, getPreferenceValues, getSelectedText, List } from "@raycast/api";
import { DataFeedsAPI } from "./components/DataFeedsAPI";
import { Discoverability } from "./components/Discoverability";
import { DNSCertificates } from "./components/DNSCertificates";
import { ErrorDisplay, PartialErrorBanner } from "./components/ErrorDisplay";
import { HTTPHeaders } from "./components/HTTPHeaders";
import { MetadataSemantics } from "./components/MetadataSemantics";
import { Overview } from "./components/Overview";
import { ResourcesAssets } from "./components/ResourcesAssets";
import { WaybackMachine } from "./components/WaybackMachine";
import { LoadingProgress, useFetchSite } from "./hooks/useFetchSite";
import { extractUrl, validateUrl } from "./utils/urlUtils";

export type { LoadingProgress };

const preferences = getPreferenceValues<Preferences.Digger>();

export default function Command(props: { arguments: Arguments.Digger }) {
  const { url: inputUrl } = props.arguments;
  const [url, setUrl] = useState<string | undefined>(inputUrl);
  const { data, isLoading, error, errorType, fetchErrors, fetchSite, refetch, certificateInfo, progress } =
    useFetchSite(url);

  useEffect(() => {
    (async () => {
      if (inputUrl) {
        const extracted = validateUrl(inputUrl) ? inputUrl : extractUrl(inputUrl);
        if (extracted) {
          setUrl(extracted);
          return;
        }
      }

      if (preferences.autoLoadUrlFromClipboard) {
        const clipboardText = await Clipboard.readText();
        if (clipboardText) {
          const extracted = validateUrl(clipboardText) ? clipboardText : extractUrl(clipboardText);
          if (extracted) {
            setUrl(extracted);
            return;
          }
        }
      }

      if (preferences.autoLoadUrlFromSelectedText) {
        try {
          const selectedText = await getSelectedText();
          if (selectedText) {
            const extracted = validateUrl(selectedText) ? selectedText : extractUrl(selectedText);
            if (extracted) {
              setUrl(extracted);
              return;
            }
          }
        } catch {
          // Suppress the error if Raycast didn't find any selected text
        }
      }

      if (preferences.enableBrowserExtensionSupport) {
        try {
          const tabUrl = (await BrowserExtension.getTabs()).find((tab) => tab.active)?.url;
          if (tabUrl) {
            const extracted = validateUrl(tabUrl) ? tabUrl : extractUrl(tabUrl);
            if (extracted) {
              setUrl(extracted);
              return;
            }
          }
        } catch {
          // Suppress the error if Raycast didn't find browser extension
        }
      }
    })();
  }, []);

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
  // reserved an empty half-window next to a centred message.
  if (error && !hasPartialData) {
    return (
      <List>
        <ErrorDisplay error={error} errorType={errorType} fetchErrors={fetchErrors} onRetry={refetch} url={url} />
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
      {fetchErrors.length > 0 && <PartialErrorBanner fetchErrors={fetchErrors} onRetry={refetch} />}
      <Overview data={data} onRefresh={refetch} overallProgress={overallProgress} />
      <MetadataSemantics data={data} onRefresh={refetch} progress={progress.metadata} />
      <Discoverability data={data} onRefresh={refetch} progress={progress.discoverability} />
      <ResourcesAssets data={data} onRefresh={refetch} progress={progress.resources} />
      <HTTPHeaders data={data} onRefresh={refetch} progress={progress.networking} />
      <DNSCertificates data={data} onRefresh={refetch} certificateInfo={certificateInfo} progress={progress.dns} />
      <DataFeedsAPI data={data} onRefresh={refetch} progress={progress.dataFeeds} />
      <WaybackMachine data={data} onRefresh={refetch} progress={progress.history} />
    </List>
  );
}
