import { Action, ActionPanel, Color, Icon, List, getPreferenceValues, open } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { exec as execCb } from "child_process";
import { useState } from "react";
import { promisify } from "util";
import { dataType, optionType } from "./types";
import { extensionTypes } from "./constants";

const exec = promisify(execCb);

export default function IndexCommand() {
  const preferenes = getPreferenceValues<Preferences.Index>();

  let jqPath = "/opt/homebrew/bin/jq";
  if (preferenes.jqPath || preferenes.jqPath?.trim()) {
    jqPath = preferenes.jqPath;
  }

  const [installedExtensions, setInstalledExtensions] = useState<dataType[]>([]);
  const { isLoading, data } = useCachedPromise(async () => {
    const { stdout, stderr } = await exec(
      `find ~/.config/raycast/extensions/**/package.json -exec echo -n "{}: " \\; -exec ${jqPath} -r '. | "\\(.author) \\(.icon) \\(.commands | length) \\(.name)"' {} \\;`
    );

    if (stderr) {
      showFailureToast("Correct the path to jq or dowbload jq", {
        primaryAction: {
          title: "Download jq",
          onAction: () => {
            open("https://jqlang.github.io/jq/download/");
          },
        },
      });
      return [];
    }

    let result = stdout.split("\n").map((item) => {
      const [path, author, icon, commands, ...nameParts] = item.trim().split(" ");
      const name = nameParts.join(" ");
      const cleanedPath = path.replace("/package.json:", "");

      return {
        path: cleanedPath,
        name,
        author,
        icon,
        commands,
        isLocalExtension: !!cleanedPath.match(/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/gi),
      };
    });

    result = result.filter((item) => item.name !== "" && item.author !== "");
    result = result.sort((a, b) => a.name.localeCompare(b.name));

    setInstalledExtensions(result);

    return result;
  });

  function ExtensionTypeDropdown(props: {
    ExtensionTypes: optionType[];
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
    const filteredExtensions: dataType[] =
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

            accessories.push({ tag: item.author, icon: Icon.Person, tooltip: "Author" });
            accessories.push({ tag: `${item.commands}`, icon: Icon.ComputerChip, tooltip: "Commands" });

            return (
              <List.Item
                key={index}
                icon={`${item.path}/assets/${item.icon}`}
                title={item.name}
                keywords={[item.author]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Extension">
                      <Action.CopyToClipboard title="Copy Name to Clipboard" content={item.name} />
                      <Action.CopyToClipboard title="Copy Author to Clipboard" content={item.author} />
                    </ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Extension List to Clipboard"
                      content={`${installedExtensions.length} installed extensions: ${installedExtensions
                        .map((item) => item.name)
                        .join(", ")}`}
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
