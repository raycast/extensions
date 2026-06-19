import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Color, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchInputSources, setInputSource, InputSource } from "./commands";

import events from "./events";

type InputSourceListProps = {
  display: {
    tagID: string;
    name: string;
  };
};

export default function InputSourceList({ display }: InputSourceListProps) {
  const [sources, setSources] = useState<InputSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSources() {
      try {
        const data = await fetchInputSources(display.tagID);
        setSources(data);
      } catch (error) {
        console.error("Failed to load input sources", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSources();
  }, [display.tagID]);

  async function handleSetSource(vcpValue: string, ddc2ab: boolean) {
    try {
      await setInputSource(display.tagID, vcpValue, ddc2ab);
      await showToast({
        title: "Input Source Changed",
        message: `${display.name} input switched`,
        style: Toast.Style.Success,
      });
      events.emit("refresh");
    } catch (error) {
      showFailureToast(error, { title: "Error changing input source" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select an input source">
      {sources.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Input Sources"
          description="No custom input sources configured. Set them up in BetterDisplay Settings > Displays > Customize input source list."
        />
      ) : (
        sources.map((source) => (
          <List.Item
            key={source.vcpValue}
            title={source.label}
            accessories={[
              {
                tag: {
                  value: source.enabled ? "Enabled" : "Hidden",
                  color: source.enabled ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Switch to This Input" onAction={() => handleSetSource(source.vcpValue, source.ddc2ab)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
