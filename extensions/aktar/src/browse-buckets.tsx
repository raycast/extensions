import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isConnectionError, listDestinations } from "./api/client";
import { BucketBrowser } from "./components/BucketBrowser";
import { ConnectionEmptyView } from "./components/ConnectionEmptyView";
import { UploadForm } from "./components/UploadForm";
import { showAktarFailure } from "./lib/errors";
import { destinationIcon } from "./lib/format";

export default function Command() {
  const {
    data: destinations,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(listDestinations, [], {
    onError: (error) => {
      if (!isConnectionError(error)) showAktarFailure(error, "Couldn't load destinations");
    },
  });

  // With a single destination there's nothing to choose: go straight into its bucket.
  if (destinations?.length === 1 && !error) {
    return <BucketBrowser destination={destinations[0]} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search destinations">
      {error && isConnectionError(error) ? (
        <ConnectionEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Cloud}
          title="No Destinations"
          description="Add your S3-compatible storage in Aktar's Settings first."
          actions={
            <ActionPanel>
              <Action title="Open Aktar Settings" icon={Icon.Gear} onAction={() => open("aktar://settings")} />
            </ActionPanel>
          }
        />
      )}
      {(destinations ?? []).map((destination) => (
        <List.Item
          key={destination.id}
          icon={destinationIcon(destination)}
          title={destination.name}
          subtitle={destination.bucket}
          keywords={[destination.bucket, destination.providerName]}
          accessories={[...(destination.isDefault ? [{ tag: "Default" }] : []), { text: destination.providerName }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Bucket"
                icon={Icon.ArrowRight}
                target={<BucketBrowser destination={destination} />}
              />
              <Action.Push
                title="Upload Files"
                icon={Icon.Upload}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
                target={<UploadForm destinationId={destination.id} />}
              />
              {destination.publicBaseURL && (
                <Action.OpenInBrowser
                  title="Open Public Base URL"
                  url={
                    destination.publicBaseURL.includes("://")
                      ? destination.publicBaseURL
                      : `https://${destination.publicBaseURL}`
                  }
                />
              )}
              <Action
                title="Open Aktar Library"
                icon={Icon.AppWindowSidebarLeft}
                onAction={() => open("aktar://library")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
