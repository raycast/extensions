import { ActionPanel, Detail, List, Action, getPreferenceValues } from "@raycast/api";
import { parse } from "csv-parse";
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
  const preferences: CommandPreferences = getPreferenceValues();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv"
        );
        parse(response.data, { columns: true }, (err, records) => {
          setData(records);
        });
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  return (
    <List>
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
