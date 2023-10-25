import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
  open,
  Clipboard,
  showHUD,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { exec as execCb } from "child_process";
import { useState } from "react";
import { promisify } from "util";
import { DataType, OptionType } from "./types";
import { extensionTypes } from "./constants";
import { formatItem, formatOutput } from "./utils";

const exec = promisify(execCb);

export default function IndexCommand() {
  const preferences = getPreferenceValues<Preferences.Index>();

  let jqPath = process.arch == "arm64" ? "/opt/homebrew/bin/jq" : "/usr/local/homebrew/bin/jq";
  if (preferences.jqPath || preferences.jqPath?.trim()) {
    jqPath = preferences.jqPath;
  }

  const [installedExtensions, setInstalledExtensions] = useState<DataType[]>([]);
  const { isLoading, data, error } = useCachedPromise(async () => {
    const { stdout, stderr } = await exec(
      `find ~/.config/raycast/extensions/**/package.json -exec echo -n "{}: " \\; -exec ${jqPath} -r '. | "\\(.author) \\(.icon) \\(.commands | length) \\(.name) \\(.owner) \\(.title)"' {} \\;`,
    );

    if (stderr) {
      showFailureToast("Correct the path to jq or download jq", {
        primaryAction: {
          title: "Download jq",
          onAction: () => {
            open("https://jqlang.github.io/jq/download/");
          },
        },
      });

      throw new Error("Correct the path to jq or download jq");
    }

    let result = stdout.split("\n").map((item) => {
      const [path, author, icon, commands, name, owner, ...titleParts] = item.trim().split(" ");
      const title = titleParts.join(" ");
      const cleanedPath = path.replace("/package.json:", "");
      const link = `https://raycast.com/${owner == "null" ? author : owner}/${name}`;

      return {
        path: cleanedPath,
        name,
        author,
        icon,
        commands,
        owner,
        title,
        link,
        isOrganization: owner !== "null",
        isLocalExtension: !cleanedPath.match(/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/gi),
      };
    });

    result = result.filter((item) => item.title !== "" && item.author !== "");
    result = result.sort((a, b) => a.title.localeCompare(b.title));

    setInstalledExtensions(result);

    return result;
  });

  function ExtensionTypeDropdown(props: {
    ExtensionTypes: OptionType[];
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
    const filteredExtensions: DataType[] =
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
        title={error ? "Correct the path to jq or download jq" : "No Results"}
        icon={error ? { source: Icon.Warning, tintColor: Color.Red } : "noview.png"}
        actions={
          error ? (
            <ActionPanel>
              <Action.OpenInBrowser url="https://jqlang.github.io/jq/download/" title="Download Jq" />
            </ActionPanel>
          ) : null
        }
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

            if (item.isOrganization) {
              accessories.push({ tag: item.owner, icon: Icon.Crown, tooltip: "Organization" });
            } else {
              accessories.push({ tag: item.author, icon: Icon.Person, tooltip: "Author" });
            }

            accessories.push({ tag: `${item.commands}`, icon: Icon.ComputerChip, tooltip: "Commands" });

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
                        onAction={() => {
                          Clipboard.copy(formatItem(item, preferences.format));
                          showHUD("Copied to Clipboard");
                        }}
                        title="Copy Item to Clipboard"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd"], key: "." }}
                      />
                      <Action
                        onAction={() => {
                          Clipboard.copy(
                            formatOutput(
                              installedExtensions,
                              preferences.format,
                              preferences.separator,
                              preferences.prepend,
                            ),
                          );
                          showHUD("Copied to Clipboard");
                        }}
                        title="Copy Extension List to Clipboard"
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                      />
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
