import { ActionPanel, Detail, List, Action, getPreferenceValues, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

type CommandPreferences = {
  primaryAction: "copy" | "paste";
};

type Data = {
  act: string;
  prompt: string;
};

export default function Command() {
  const [data, setData] = useState<Data[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const preferences: CommandPreferences = getPreferenceValues();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          "https://raw.githubusercontent.com/PlexPt/awesome-chatgpt-prompts-zh/main/prompts-zh.json"
        );
        //const result = await response.data;
        setData(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <List isLoading={isLoading}>
      {data.map((item, index) => {
        return (
          <List.Item
            key={item.act + index}
            icon="list-icon.png"
            title={item.act}
            actions={
              <ActionPanel>
                {preferences.primaryAction === "copy" ? (
                  <>
                    <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
                    <Action.Paste title="Paste Prompt in Active App" content={item.prompt} />
                  </>
                ) : (
                  <>
                    <Action.Paste title="Paste Prompt in Active App" content={item.prompt} />
                    <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
                  </>
                )}
                <Action.Push
                  title="Show Prompt"
                  icon={Icon.Terminal}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={
                    <Detail
                      markdown={item.prompt}
                      actions={
                        <ActionPanel>
                          {preferences.primaryAction === "copy" ? (
                            <>
                              <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
                              <Action.Paste title="Paste Prompt in Active App" content={item.prompt} />
                            </>
                          ) : (
                            <>
                              <Action.Paste title="Paste Prompt in Active App" content={item.prompt} />
                              <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
                            </>
                          )}
                        </ActionPanel>
                      }
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
