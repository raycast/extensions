import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { runPlatform } from "./services/api";
import { useEffect, useState } from "react";

export default function sCommand({
  arguments: { input = "" },
}: {
  arguments: { input: string };
}) {
  const lower_input = input.toLowerCase();

  const [state, setState] = useState<any>([] as any);

  useEffect(() => {
    async function fetchData() {
      const response = await runPlatform(lower_input);
      setState(response);
    }

    fetchData();
  }, []);

  return (
    <List searchBarPlaceholder="Search for a gene, disease, or drug...">
      ≥
      {state.map((item: any) => (
        <List.Item
          key={item.id}
          icon={
            item.entity === "target"
              ? Icon.Dna
              : item.entity === "drug"
              ? Icon.Pill
              : Icon.Heart
          }
          title={item.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={item.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
