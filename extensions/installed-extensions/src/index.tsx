import {
  Action,
  ActionPanel,
  Application,
  Color,
  Icon,
  List,
  getDefaultApplication,
  getPreferenceValues,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ExtensionMetadata, Option } from "./types";
import { extensionTypes } from "./constants";
import { formatItem, formatOutput } from "./utils";
import fs from "fs/promises";
import os from "os";
import path from "path";

async function getPackageJsonFiles() {
  try {
    const extensionsDir = path.join(os.homedir(), ".config", "raycast", "extensions");
    const extensions = await fs.readdir(extensionsDir);
    const packageJsonFiles = await Promise.all(
      extensions.map(async (extension) => {
        const packageJsonPath = path.join(extensionsDir, extension, "package.json");
        try {
          await fs.access(packageJsonPath, fs.constants.F_OK);
          return packageJsonPath;
        } catch {
          return null;
        }
      }),
    );
    return packageJsonFiles.filter((file) => file !== null) as string[];
  } catch (e) {
    if (e instanceof Error) {
      showFailureToast(e.message);
      throw new Error(e.message);
    }
    throw new Error("An unknown error occurred");
  }
}

function OpenManifestInDefaultAppAction(props: { url: string }) {
  const [defaultApp, setDefaultApp] = useState<Application>();
  useEffect(() => {
    getDefaultApplication(props.url)
      .then((app) => setDefaultApp(app))
      .catch(() => setDefaultApp(undefined));
  }, [props.url]);
  if (!defaultApp) {
    return null;
  }
  return (
    <Action.Open
      title={`Open Manifest in ${defaultApp.name}`}
      target={props.url}
      icon={{ fileIcon: defaultApp.path }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
    />
  );
}

export default function IndexCommand() {
  const preferences = getPreferenceValues<Preferences.Index>();

  const [installedExtensions, setInstalledExtensions] = useState<ExtensionMetadata[]>([]);
  const { isLoading, data, error } = useCachedPromise(async () => {
    const files = await getPackageJsonFiles();
    let result = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(file, "utf-8");
        const stats = await fs.stat(file);
        const json = JSON.parse(content);

        const author: string = json.author;
        const owner: string | undefined = json?.owner;
        const access: string | undefined = json?.access;
        const name: string = json.name;
        const link = `https://raycast.com/${owner ?? author}/${name}`;
        const cleanedPath = file.replace("/package.json", "");

        return {
          path: cleanedPath,
          name,
          author,
          icon: json.icon,
          commandCount: json.commands.length,
          owner,
          access,
          title: json.title,
          handle: `${owner ?? author}/${name}`,
          link,
          created: stats.ctime,
          isLocalExtension: !/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/gi.test(cleanedPath),
        };
      }),
    );

    result = result.filter((item) => item.title !== "" && item.author !== "");
    result = result.sort((a, b) => a.title.localeCompare(b.title));

    setInstalledExtensions(result);

    return result;
  });

  function ExtensionTypeDropdown(props: {
    ExtensionTypes: Option[];
    onExtensionTypeChange: (newValue: string) => void;
  }) {
    const { ExtensionTypes, onExtensionTypeChange } = props;
    return (
      <List.Dropdown
        tooltip="Select Extension Type"
        storeValue={false}
        onChange={(newValue) => {
          onExtensionTypeChange(newValue);
        }}
      >
        <List.Dropdown.Section title="Extension Type">
          {ExtensionTypes.map((extensionType) => (
            <List.Dropdown.Item key={extensionType.id} title={extensionType.name} value={extensionType.id} />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    );
  }

  const onExtensionTypeChange = (newValue: string) => {
    const filteredExtensions: ExtensionMetadata[] =
      data?.filter((item) => {
        return newValue === "local" ? item.isLocalExtension : newValue === "store" ? !item.isLocalExtension : true;
      }) || [];

    setInstalledExtensions(filteredExtensions);
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <ExtensionTypeDropdown ExtensionTypes={extensionTypes} onExtensionTypeChange={onExtensionTypeChange} />
      }
    >
      <List.EmptyView
        title={error ? "An Error Occurred" : "No Results"}
        icon={error ? { source: Icon.Warning, tintColor: Color.Red } : "noview.png"}
      />

      <List.Section title="Installed Extensions" subtitle={`${installedExtensions?.length}`}>
        {installedExtensions &&
          installedExtensions.map((item, index) => {
            const accessories = [];
            if (item.isLocalExtension) {
              accessories.push({
                tag: { color: Color.Green, value: "Local extension" },
                icon: Icon.HardDrive,
              });
            }

            if (item.owner) {
              accessories.push({ tag: item.owner, icon: Icon.Crown, tooltip: "Organization" });
            } else {
              accessories.push({ tag: item.author, icon: Icon.Person, tooltip: "Author" });
            }

            if (item.owner && item.access === undefined) {
              accessories.push({
                tag: { color: Color.Red, value: "Private" },
                icon: Icon.EyeDisabled,
                tooltip: "Private Extension",
              });
            }

            const date = new Date(item.created);

            accessories.push({ tag: `${item.commandCount}`, icon: Icon.ComputerChip, tooltip: "Commands" });
            accessories.push({ date: date, tooltip: `Last updated: ${date.toLocaleString()}` });

            return (
              <List.Item
                key={index}
                icon={`${item.path}/assets/${item.icon}`}
                title={item.title}
                keywords={[item.author]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Extension">
                      <Action
                        icon={Icon.Play}
                        title="Launch Extension"
                        onAction={() => {
                          open(`raycast://extensions/${item.handle}`);
                        }}
                      />
                      <Action.OpenInBrowser url={item.link} />
                      <Action.CopyToClipboard
                        title="Copy Item to Clipboard"
                        content={formatItem(item, preferences.format)}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Extension List to Clipboard"
                        content={formatOutput(
                          installedExtensions,
                          preferences.format,
                          preferences.separator,
                          preferences.prepend,
                        )}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <OpenManifestInDefaultAppAction url={path.join(item.path, "package.json")} />
                    </ActionPanel.Section>
                    <Action
                      title="Open Extension Preferences"
                      onAction={openExtensionPreferences}
                      icon={Icon.Gear}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                    />
                  </ActionPanel>
                }
                accessories={accessories}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
