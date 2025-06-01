import { ActionPanel, Action, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";

interface Script {
  title: string;
  game: {
    name: string;
    imageUrl: string;
  };
  script: string;
  views: number;
  verified: boolean;
  working: boolean;
}

interface ScriptBloxResponse {
  result: {
    scripts: Script[];
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function searchScripts(query: string) {
    if (!query) return;

    setIsLoading(true);
    try {
      const url = new URL("https://scriptblox.com/api/script/search");
      url.searchParams.append("q", query);
      url.searchParams.append("page", "1");
      url.searchParams.append("max", "20");
      url.searchParams.append("mode", "free");
      url.searchParams.append("order", "desc");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Raycast Extension",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as ScriptBloxResponse;
      setScripts(data.result.scripts);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to search scripts",
        message: error instanceof Error ? error.message : String(error),
      });
      setScripts([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchText) {
        searchScripts(searchText);
      } else {
        setScripts([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchText]);

  async function copyScript(script: Script) {
    try {
      await showToast({
        style: Toast.Style.Success,
        title: "Script Copied",
        message: "Ready to paste in the executor",
      });
      return script.script;
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy script",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for scripts..."
      throttle
    >
      {scripts.map((script, index) => (
        <List.Item
          key={index}
          title={script.title}
          subtitle={script.game.name}
          icon={script.game.imageUrl}
          accessories={[
            { text: `${script.views} views` },
            { icon: script.verified ? Icon.CheckCircle : undefined },
            {
              icon: script.working
                ? { source: Icon.Play, tintColor: Color.Green }
                : { source: Icon.XmarkCircle, tintColor: Color.Red },
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Script" content={script.script} onCopy={() => copyScript(script)} />
              <Action.Push
                title="View Details"
                target={
                  <List.Item
                    title={script.title}
                    subtitle={script.game.name}
                    detail={
                      <List.Item.Detail
                        markdown={`# ${script.title}\n\n## Game\n${script.game.name}\n\n## Script\n\`\`\`lua\n${script.script}\n\`\`\``}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Views" text={String(script.views)} />
                            <List.Item.Detail.Metadata.Label title="Verified" text={script.verified ? "Yes" : "No"} />
                            <List.Item.Detail.Metadata.Label title="Working" text={script.working ? "Yes" : "No"} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
