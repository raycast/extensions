import { List, showToast, ToastStyle, OpenInBrowserAction, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

type Tool = {
  path: string;
  title: string;
};

type category = {
  tools: Tool[];
  category: string;
};

export default function Command() {
  const [tools, setTools] = useState<category[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const getTools = async () => {
      const data = await axios.get("https://bazinga.tools/tools.json");
      return data.data;
    };

    getTools().then(setTools, setError);
  }, []);

  if (error) {
    showToast(ToastStyle.Failure, "Failed loading tools", error.message);
  }

  return (
    <List isLoading={!tools && !error} searchBarPlaceholder="Filter tools by name...">
      {tools?.map(({ category, tools }) => (
        <List.Section key={category} title={category}>
          {tools.map((tool) => (
            <List.Item
              key={tool.title}
              title={tool.title}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <OpenInBrowserAction url={`https://bazinga.tools${tool.path}`}></OpenInBrowserAction>
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
