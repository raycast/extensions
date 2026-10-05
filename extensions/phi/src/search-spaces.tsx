import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { runPhiCommand, runPhiCommandAction } from "./command-compatibility";
import { activateSpace, getSpaces } from "./phi";
import { PhiErrorView } from "./components/error-view";
import { resolveSpaceIcon } from "./space-icon";
import { runViewAction } from "./window-command";

export default function SearchSpaces() {
  const {
    data: spaces = [],
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(() => runPhiCommand("search-spaces", getSpaces));

  if (error) {
    return <PhiErrorView error={error} onRetry={revalidate} />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by Space or profile name"
    >
      {spaces.map((space) => (
        <List.Item
          key={space.id}
          title={space.title}
          keywords={[space.profileId, space.profileName]}
          icon={resolveSpaceIcon(space.iconData)}
          actions={
            <ActionPanel>
              <Action
                title="Activate Space"
                icon={Icon.Window}
                onAction={() =>
                  runViewAction(
                    () =>
                      runPhiCommandAction(
                        "search-spaces",
                        "activate-space",
                        () => activateSpace(space.id),
                      ),
                    "Could Not Activate Space",
                    "Try refreshing the list.",
                  )
                }
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
      {spaces.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Spaces Found"
          description="No Phi Spaces are currently available."
          icon={Icon.AppWindowGrid2x2}
        />
      ) : null}
    </List>
  );
}
