import { List, Clipboard, getPreferenceValues, getSelectedText, BrowserExtension } from "@raycast/api";
import { useEffect, useState } from "react";
import { validateUrl, extractUrl } from "./utils/urlUtils";
import { useFetchSite, LoadingProgress } from "./hooks/useFetchSite";
import { Overview } from "./components/Overview";
import { MetadataSemantics } from "./components/MetadataSemantics";
import { Discoverability } from "./components/Discoverability";
import { ResourcesAssets } from "./components/ResourcesAssets";
import { HTTPHeaders } from "./components/HTTPHeaders";
import { DNSCertificates } from "./components/DNSCertificates";
import { WaybackMachine } from "./components/WaybackMachine";
import { DataFeedsAPI } from "./components/DataFeedsAPI";
import { ErrorDisplay, PartialErrorBanner } from "./components/ErrorDisplay";

export type { LoadingProgress };

interface Arguments {
  url?: string;
}

const preferences = getPreferenceValues();

export default function Command(props: { arguments: Arguments }) {
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

  // Show full error state only if we have no partial data
  if (error && !hasPartialData) {
    return (
      <List isShowingDetail>
        <ErrorDisplay
          error={error}
          errorType={errorType}
          fetchErrors={fetchErrors}
          onRetry={refetch}
          hasPartialData={false}
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
