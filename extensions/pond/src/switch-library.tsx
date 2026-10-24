import { Action, ActionPanel, closeMainWindow, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { pondClient } from "./api";
import type { PondLibrary } from "./api/schemas";
import { ConnectionActions } from "./components/connection-actions";

async function listLibraries() {
  return pondClient().libraries();
}

export default function SwitchLibrary() {
  const {
    data: libraries,
    error,
    isLoading,
    revalidate,
  } = usePromise(listLibraries, [], {
    failureToastOptions: { title: "Could Not Load Libraries" },
  });
  const pending = useRef(false);
  const [switching, setSwitching] = useState(false);

  async function selectLibrary(library: PondLibrary) {
    if (pending.current) return;
    pending.current = true;
    setSwitching(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Opening Library", message: library.name });
    try {
      await pondClient().selectLibrary(library.path);
      await open("pond://library");
      toast.style = Toast.Style.Success;
      toast.title = "Opened Library";
      await closeMainWindow();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Open Library";
      toast.message = error instanceof Error ? error.message : "Open Pond and try again.";
      await revalidate();
    } finally {
      pending.current = false;
      setSwitching(false);
    }
  }

  return (
    <List
      isLoading={isLoading || switching}
      searchBarPlaceholder="Search recent libraries…"
      actions={
        <ActionPanel>
          <ConnectionActions onRefresh={revalidate} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Folder}
        title={error ? "Could Not Load Libraries" : "No Recent Libraries"}
        description={error?.message ?? "Open a library in Pond first, then refresh."}
      />
      {libraries?.map((library) => (
        <List.Item
          key={library.path}
          icon={Icon.Folder}
          title={library.name}
          subtitle={library.path}
          keywords={[library.path]}
          accessories={
            library.active
              ? [{ tag: { value: "Active", color: Color.Green } }]
              : library.available
                ? []
                : [{ tag: "Unavailable" }]
          }
          actions={
            <ActionPanel>
              {library.available || library.active ? (
                <Action
                  title={library.active ? "Open in Pond" : "Switch Library"}
                  icon={Icon.AppWindow}
                  onAction={() => selectLibrary(library)}
                />
              ) : null}
              {library.available ? <Action.ShowInFinder path={library.path} /> : null}
              <Action.CopyToClipboard title="Copy Library Path" content={library.path} />
              <ActionPanel.Section>
                <ConnectionActions onRefresh={revalidate} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
