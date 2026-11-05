import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  open,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ApiLibrary } from "pond-api";
import { pond } from "./api/client";
import { toError } from "./api/problems";
import { failToast, ProblemView } from "./components/problem";
import { LIBRARY_LINK } from "./lib/links";

async function loadLibraries() {
  return pond().libraries();
}

async function switchTo(library: ApiLibrary) {
  if (library.active) {
    await open(LIBRARY_LINK);
    return popToRoot({ clearSearchBar: true });
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Switching Library", message: library.name });
  try {
    await pond().switchLibrary(library.path);
    await toast.hide();
    await showHUD(`Switched to ${library.name}`);
    await popToRoot({ clearSearchBar: true });
  } catch (error) {
    failToast(toast, toError(error), "Couldn't switch libraries");
  }
}

export default function Command() {
  const libraries = useCachedPromise(loadLibraries, [], { keepPreviousData: true });
  const data = [...(libraries.data ?? [])].sort(
    (a, b) => Number(b.active) - Number(a.active) || b.lastOpened - a.lastOpened,
  );
  const failed = libraries.error && !data.length ? toError(libraries.error) : null;

  return (
    <List isLoading={libraries.isLoading} searchBarPlaceholder="Search libraries…">
      {failed ? (
        <ProblemView error={failed} onRetry={libraries.revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Folder}
          title="No recent libraries"
          description="Libraries you open in Pond show up here."
        />
      )}
      {data.map((library) => (
        <List.Item
          key={library.path}
          icon={library.icon ?? Icon.Folder}
          title={library.name}
          subtitle={library.path.replace(/^\/Users\/[^/]+/, "~")}
          keywords={[library.path]}
          accessories={
            library.active
              ? [{ tag: { value: "Open", color: library.accent ?? Color.Green } }]
              : library.available
                ? [{ date: new Date(library.lastOpened), tooltip: "Last opened" }]
                : [{ tag: { value: "Missing", color: Color.Red }, tooltip: "Pond can't find this library on disk" }]
          }
          actions={
            <ActionPanel>
              {library.available && (
                <Action
                  title={library.active ? "Open in Pond" : "Switch Library"}
                  icon={library.active ? Icon.AppWindow : Icon.Switch}
                  onAction={() => switchTo(library)}
                />
              )}
              {library.available && <Action.ShowInFinder path={library.path} />}
              <Action.CopyToClipboard
                title="Copy Library Path"
                content={library.path}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={libraries.revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
