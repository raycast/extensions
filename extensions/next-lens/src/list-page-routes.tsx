import {
  Action,
  ActionPanel,
  Application,
  Color,
  getPreferenceValues,
  Icon,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchPageRoutes } from "./next-lens-client";
import { PageRoute, LoadingStatus, ErrorStatus } from "./types";

interface Preferences {
  ideApp: Application;
}

// Map status to colors for visual distinction
const STATUS_COLORS: Record<LoadingStatus | ErrorStatus, Color> = {
  "co-located": Color.Green,
  inherited: Color.Blue,
  missing: Color.SecondaryText,
};

export default function ListPageRoutes() {
  const { ideApp } = getPreferenceValues<Preferences>();

  const { data, isLoading, error, revalidate } = useCachedPromise(fetchPageRoutes, [], {
    keepPreviousData: true,
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch page routes",
        message: err.message,
      });
    },
  });

  async function openInIDE(filePath: string) {
    try {
      await open(filePath, ideApp);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to open file",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search page routes...">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Unable to connect to next-lens"
          description="Please run npx next-lens@latest raycast in your Next.js project"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Command" content="npx next-lens@latest raycast" />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : data?.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No routes found" description="No page routes available" />
      ) : (
        data?.map((route) => <PageRouteItem key={route.path} route={route} onOpenInIDE={openInIDE} />)
      )}
    </List>
  );
}

function PageRouteItem({ route, onOpenInIDE }: { route: PageRoute; onOpenInIDE: (filePath: string) => void }) {
  const hasLoadingFile = route.loading !== "missing" && route.loadingPath;
  const hasErrorFile = route.error !== "missing" && route.errorPath;

  return (
    <List.Item
      title={route.path}
      accessories={[
        {
          tag: {
            value: `loading: ${route.loading}`,
            color: STATUS_COLORS[route.loading],
          },
        },
        {
          tag: {
            value: `error: ${route.error}`,
            color: STATUS_COLORS[route.error],
          },
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open Files">
            <Action title="Open Page in IDE" icon={Icon.Code} onAction={() => onOpenInIDE(route.file)} />
            {hasLoadingFile && (
              <Action
                title="Open Loading UI in IDE"
                icon={Icon.Clock}
                onAction={() => onOpenInIDE(route.loadingPath!)}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            )}
            {hasErrorFile && (
              <Action
                title="Open Error UI in IDE"
                icon={Icon.ExclamationMark}
                onAction={() => onOpenInIDE(route.errorPath!)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Path"
              content={route.path}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy File Path"
              content={route.file}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
