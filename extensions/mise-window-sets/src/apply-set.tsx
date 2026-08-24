import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { applySetURL, layoutsFilePath, loadSets } from "./sets";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(loadSets);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Sets…">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not load Sets"
          description={`Install Mise and capture a Set first.\n${layoutsFilePath}`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Get Mise"
                url="https://usemise.dev"
              />
            </ActionPanel>
          }
        />
      ) : null}

      {!error && !isLoading && (data?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.AppWindowGrid2x2}
          title="No Sets found"
          description="Capture a Set from Mise’s menu bar, then reload this list."
          actions={
            <ActionPanel>
              <Action
                title="Reload List"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Get Mise"
                url="https://usemise.dev"
              />
            </ActionPanel>
          }
        />
      ) : null}

      {(data ?? []).map((set) => (
        <List.Item
          key={set.name}
          title={set.name}
          icon={Icon.AppWindowGrid2x2}
          actions={
            <ActionPanel>
              <Action
                title="Apply Set"
                icon={Icon.Play}
                onAction={async () => {
                  try {
                    await open(applySetURL(set.name));
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Applying “${set.name}”`,
                      message: "Requires Mise Pro for layouts:// apply",
                    });
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to apply Set",
                      message: err instanceof Error ? err.message : String(err),
                    });
                  }
                }}
              />
              <Action
                title="Reload List"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Mise Pro / Download"
                url="https://usemise.dev"
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
