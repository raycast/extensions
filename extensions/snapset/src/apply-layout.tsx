import { Action, ActionPanel, Application, Icon, Keyboard, List, closeMainWindow, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  Layout,
  SnapsetNotInstalledError,
  SnapsetTooOldError,
  WEBSITE,
  findSnapset,
  layoutIcon,
  listLayouts,
  request,
} from "./snapset";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error } = usePromise(async () => {
    const app = await findSnapset();
    const listing = await listLayouts(app);
    return { app, listing };
  });

  if (error) return <Problem error={error} />;

  // Snapset only applies a layout on the displays it was saved on, so the others are
  // left out — the same list Snapset's own "type a layout name" panel shows.
  const layouts = data?.listing.layouts.filter((layout) => layout.current) ?? [];
  const setupName = layouts[0]?.setupName;

  return (
    // The search text is also the name for "Save Current Arrangement", so it is read here — and
    // reading it switches Raycast's own filtering off unless `filtering` says otherwise.
    <List isLoading={isLoading} filtering searchBarPlaceholder="Search layouts…" onSearchTextChange={setSearchText}>
      {data && (
        <List.EmptyView
          icon={Icon.AppWindowGrid2x2}
          title={searchText ? "No Matching Layout" : "No Layouts for These Displays"}
          description={
            searchText
              ? `Save the current arrangement as “${searchText}”.`
              : "Arrange your windows, then save them as a layout."
          }
          actions={
            <ActionPanel>
              <SaveAction app={data.app} name={searchText} />
            </ActionPanel>
          }
        />
      )}
      {data && (
        <List.Section title={setupName}>
          {layouts.map((layout) => (
            <LayoutItem key={layout.id} app={data.app} layout={layout} searchText={searchText} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function LayoutItem({ app, layout, searchText }: { app: Application; layout: Layout; searchText: string }) {
  const accessories: List.Item.Accessory[] = [{ text: `${layout.windows} window${layout.windows === 1 ? "" : "s"}` }];
  if (layout.hotKey) accessories.unshift({ tag: layout.hotKey, tooltip: "Snapset shortcut" });

  return (
    <List.Item
      icon={layoutIcon(layout)}
      title={layout.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Apply Layout"
            icon={Icon.AppWindowGrid2x2}
            onAction={async () => {
              // Out of the way first: Raycast's window would otherwise sit on top of the
              // arrangement while Snapset puts it in place.
              await closeMainWindow({ clearRootSearch: true });
              await request(app, "apply", { id: layout.id });
            }}
          />
          <SaveAction app={app} name={searchText} />
          <Action.CreateQuicklink
            title="Create Quicklink"
            quicklink={{ name: `Apply ${layout.name}`, link: layout.applyURL }}
          />
          <Action.CopyToClipboard
            title="Copy Apply URL"
            content={layout.applyURL}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}

function SaveAction({ app, name }: { app: Application; name: string }) {
  const trimmed = name.trim();
  return (
    <Action
      title={trimmed ? `Save Current Arrangement as “${trimmed}”` : "Save Current Arrangement"}
      icon={Icon.SaveDocument}
      shortcut={Keyboard.Shortcut.Common.Save}
      onAction={async () => {
        await closeMainWindow({ clearRootSearch: true });
        await request(app, "save", trimmed ? { name: trimmed } : {});
      }}
    />
  );
}

function Problem({ error }: { error: Error }) {
  if (error instanceof SnapsetNotInstalledError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="Snapset Is Not Installed"
          description="This extension applies the layouts you save in Snapset."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Snapset" url={WEBSITE} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (error instanceof SnapsetTooOldError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ArrowClockwise}
          title="Update Snapset"
          description="This extension needs a newer version of Snapset. Open Snapset and check for updates in its settings."
          actions={
            <ActionPanel>
              <Action title="Open Snapset" icon={Icon.AppWindow} onAction={() => open("snapset://open")} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Could Not Read Snapset’s Layouts"
        description={error.message}
      />
    </List>
  );
}
