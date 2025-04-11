import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, useNavigation, Color, Icon } from "@raycast/api";
import { fetchDisplayModeList, setDisplayResolution } from "./actions";
import events from "./events";
import { showFailureToast } from "@raycast/utils";

export type ResolutionOption = {
  modeNumber: string; // The index number (e.g., "20")
  resolution: string; // e.g., "3440x1440"
  hiDPI: boolean;
  refreshRate: string; // e.g., "50Hz"
  bpc: string; // e.g., "10bpc"
  isDefault: boolean;
  native: boolean;
  unsafe: boolean;
  current: boolean;
};

export type ResolutionListProps = {
  display: {
    tagID: string;
    name: string;
  };
};

function parseResolutionList(output: string): ResolutionOption[] {
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  const options: ResolutionOption[] = [];
  for (const line of lines) {
    // Example line:
    // "20 - 3440x1440 HiDPI 50Hz 10bpc Current Default Native"
    const parts = line.split(" - ");
    if (parts.length < 2) continue;
    const modeNumber = parts[0].trim();
    const details = parts[1].trim();
    const tokens = details.split(/\s+/);
    if (tokens.length < 3) continue;
    const resolution = tokens[0];
    let hiDPI = false;
    let index = 1;
    if (tokens[index] === "HiDPI") {
      hiDPI = true;
      index++;
    }
    const refreshRate = tokens[index] || "";
    const bpc = tokens[index + 1] || "";
    const isDefault = tokens.includes("Default");
    const native = tokens.includes("Native");
    const unsafe = tokens.includes("Unsafe");
    const current = tokens.includes("Current");
    options.push({
      modeNumber,
      resolution,
      hiDPI,
      refreshRate,
      bpc,
      isDefault,
      native,
      unsafe,
      current,
    });
  }
  return options;
}

// Helper to build accessory tags.
function getAccessoryTags(option: ResolutionOption): List.Item.Accessory[] {
  const tags: List.Item.Accessory[] = [];
  if (option.hiDPI) tags.push({ tag: { value: "HiDPI", color: Color.Magenta } });
  if (option.refreshRate) tags.push({ tag: { value: option.refreshRate, color: Color.Blue } });
  if (option.bpc) tags.push({ tag: { value: option.bpc, color: Color.Green } });
  if (option.native) tags.push({ tag: { value: "Native", color: Color.SecondaryText } });
  return tags;
}

// New component to render a resolution item.
function ResolutionItem({ option, tagID, pop }: { option: ResolutionOption; tagID: string; pop: () => void }) {
  return (
    <List.Item
      key={option.modeNumber}
      icon={option.current ? Icon.Checkmark : Icon.Minus}
      title={option.resolution}
      subtitle={option.isDefault ? "Default" : undefined}
      accessories={getAccessoryTags(option)}
      actions={
        <ActionPanel>
          <Action
            title="Set Resolution"
            onAction={async () => {
              try {
                await setDisplayResolution(tagID, option.modeNumber);
                await showToast({
                  title: "Resolution Set",
                  message: `Changed to option ${option.modeNumber} (${option.resolution})`,
                  style: Toast.Style.Success,
                });
                events.emit("refresh");
                pop();
              } catch (error) {
                showFailureToast(error, { title: "Error Setting Resolution" });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function ResolutionList(props: ResolutionListProps) {
  const { display } = props;
  const { tagID, name: displayName } = display;
  const { pop } = useNavigation();
  const [resolutionOptions, setResolutionOptions] = useState<ResolutionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadResolutions() {
      try {
        const stdout = await fetchDisplayModeList(tagID);
        const options = parseResolutionList(stdout);
        setResolutionOptions(options);
      } catch (error) {
        console.error("Failed to load resolution options", error);
        showFailureToast(error, { title: "Error Loading Resolutions" });
      } finally {
        setIsLoading(false);
      }
    }
    loadResolutions();
  }, [tagID]);

  // Divide options into safe and unsafe.
  const safeOptions = resolutionOptions.filter((option) => !option.unsafe);
  const unsafeOptions = resolutionOptions.filter((option) => option.unsafe);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Change Resolution for ${displayName}`}
      searchBarPlaceholder="Select a resolution"
    >
      <List.Section title="Safe Resolutions">
        {safeOptions.map((option) => (
          <ResolutionItem key={option.modeNumber} option={option} tagID={tagID} pop={pop} />
        ))}
      </List.Section>
      <List.Section title="Unsafe Resolutions">
        {unsafeOptions.map((option) => (
          <ResolutionItem key={option.modeNumber} option={option} tagID={tagID} pop={pop} />
        ))}
      </List.Section>
    </List>
  );
}
