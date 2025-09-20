import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, usePromise, useFrecencySorting } from "@raycast/utils";
import fs from "fs/promises";
import path from "path";
import { loadConfig } from "./config";
import { useDirs } from "./hooks";
import { useState } from "react";
import { PinnedEntry, usePinnedEntries, type PinMethods } from "./pinned";
import type { App } from "./app";

const preferences = getPreferenceValues<Preferences.SearchApps>();

function useSmallweb(dirs?: string[]) {
  const listApps = async (dirs?: string[]) => {
    if (!dirs) {
      return undefined;
    }

    const apps = await Promise.all(
      dirs.map(async (dir) => {
        const names = [];
        for await (const entry of await fs.opendir(dir)) {
          if (entry.name.startsWith(".")) {
            continue;
          }

          if (!entry.isDirectory()) {
            continue;
          }

          names.push(entry.name);
        }

        const config = await loadConfig(dir);
        const apps: App[] = names.map((name) => ({
          name,
          domain: `${name}.${config.domain}`,
          rootDomain: config.domain,
          url: `https://${name}.${config.domain}`,
          rootDir: dir,
          dir: path.join(dir, name),
        }));

        return apps;
      }),
    );

    return apps.flat();
  };

  return usePromise(listApps, [dirs]);
}

export default function SearchApps() {
  const { dirs, setDirs } = useDirs();
  const navigation = useNavigation();
  const [selectedDomain, setSelectedDomain] = useState<string>();
  const { pinnedEntries, ...pinnedMethods } = usePinnedEntries();
  const { data, mutate } = useSmallweb(dirs);

  const domains = data?.map((app) => app.rootDomain).filter((value, index, self) => self.indexOf(value) === index);
  const pinnedApps =
    selectedDomain == "<all>"
      ? (pinnedEntries.map((entry) => data?.find((app) => app.domain == entry.domain)).filter((app) => app) as App[])
      : [];

  const { data: apps, visitItem } = useFrecencySorting(
    data
      ?.filter((app) => {
        if (pinnedApps.find((pinnedApp) => pinnedApp.domain == app.domain)) {
          return false;
        }

        if (!selectedDomain || selectedDomain == "<all>") {
          return true;
        }

        return app.rootDomain == selectedDomain;
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    {
      key: (app) => app.url,
    },
  );

  const configureAction = (
    <Action.Push
      icon={Icon.Cog}
      title="Configure Directories"
      shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
      target={
        <ConfigureDirs
          defaultValue={dirs}
          onSubmit={async (dirs) => {
            await setDirs(dirs);
            navigation.pop();
          }}
        />
      }
      onPop={() => mutate()}
    />
  );

  return (
    <List
      isLoading={typeof data == "undefined"}
      searchBarAccessory={
        <List.Dropdown tooltip="Domain" defaultValue={"<all>"} onChange={(domain) => setSelectedDomain(domain)}>
          <List.Dropdown.Section>
            <List.Dropdown.Item icon={Icon.Globe} key="all" title="All Domains" value="<all>" />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {domains?.map((domain) => (
              <List.Dropdown.Item icon={Icon.Globe} key={domain} title={domain} value={domain} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No apps found, hit enter to configure directories."
        actions={<ActionPanel>{configureAction}</ActionPanel>}
      />
      <List.Section title="Pinned Apps">
        {pinnedApps?.map((app) => (
          <AppItem
            app={app}
            key={`${app.domain}:pinned`}
            pinned
            {...pinnedMethods}
            additionalActions={[configureAction]}
          />
        ))}
      </List.Section>
      <List.Section title="Apps">
        {apps?.map((app) => (
          <AppItem
            app={app}
            key={app.domain}
            visitItem={visitItem}
            {...pinnedMethods}
            additionalActions={[configureAction]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function AppItem({
  app,
  visitItem = () => {},
  pinned = false,
  additionalActions,
  ...pinnedMethods
}: { app: App; pinned?: boolean; visitItem?: (app: App) => void; additionalActions?: React.ReactNode } & PinMethods) {
  return (
    <List.Item
      icon={getFavicon(app.url, {
        mask: Image.Mask.RoundedRectangle,
        fallback: Icon.Globe,
      })}
      keywords={[app.name, app.rootDomain]}
      title={app.name}
      subtitle={app.rootDomain}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={app.url} onOpen={() => visitItem(app)} />
            {preferences.editor ? (
              <Action.Open
                title="Open in Editor"
                icon={Icon.Pencil}
                target={app.dir}
                application={preferences.editor}
                onOpen={() => visitItem(app)}
              />
            ) : null}
            <Action.Open
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              application="Finder"
              title="Open in Finder"
              target={app.dir}
              onOpen={() => visitItem(app)}
            />
            <Action.OpenWith
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              path={app.dir}
              onOpen={() => visitItem(app)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              shortcut={Keyboard.Shortcut.Common.Copy}
              title="Copy Link"
              content={app.url}
              onCopy={() => visitItem(app)}
            />
            <Action.CopyToClipboard
              shortcut={Keyboard.Shortcut.Common.CopyPath}
              title="Copy Path"
              content={app.dir}
              onCopy={() => visitItem(app)}
            />
          </ActionPanel.Section>
          <PinActionSection
            entry={{
              domain: app.domain,
            }}
            {...pinnedMethods}
            pinned={pinned}
          />
          <ActionPanel.Section>{additionalActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function PinActionSection(props: { entry: PinnedEntry; pinned?: boolean } & PinMethods) {
  return !props.pinned ? (
    <ActionPanel.Section>
      <Action
        title="Pin Entry"
        icon={Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={async () => {
          props.pin(props.entry);
          await showToast({ title: "Pinned entry" });
        }}
      />
    </ActionPanel.Section>
  ) : (
    <ActionPanel.Section>
      <Action
        title="Unpin Entry"
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        icon={Icon.PinDisabled}
        onAction={async () => {
          props.unpin(props.entry);
          await showToast({ title: "Unpinned entry" });
        }}
      />
      <Action
        title="Move up in Pinned Entries"
        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
        icon={Icon.ArrowUp}
        onAction={async () => {
          props.moveUp(props.entry);
          await showToast({ title: "Moved pinned entry up" });
        }}
      />
      <Action
        title="Move Down in Pinned Entries"
        shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
        icon={Icon.ArrowDown}
        onAction={async () => {
          props.moveDown(props.entry);
          await showToast({ title: "Moved pinned entry down" });
        }}
      />
      <Action
        title="Unpin All Entries"
        icon={Icon.PinDisabled}
        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
        style={Action.Style.Destructive}
        onAction={async () => {
          props.unpinAll();
          await showToast({ title: "Unpinned all entries" });
        }}
      />
    </ActionPanel.Section>
  );
}

function ConfigureDirs(props: { defaultValue?: string[]; onSubmit: (dirs: string[]) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              props.onSubmit(values.dirs);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="dirs"
        title="Dirs"
        canChooseFiles={false}
        canChooseDirectories
        defaultValue={props.defaultValue}
      />
    </Form>
  );
}
