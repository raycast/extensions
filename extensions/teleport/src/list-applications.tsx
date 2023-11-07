import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { applicationsList, connectToApplication } from "./utils";
import { useMemo } from "react";


async function open(name: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  try {
    connectToApplication(name);
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

export default function Command() {
  const { data, isLoading } = applicationsList();
  const results = useMemo(() => JSON.parse(data || "[]") || [], [data]);

  return (
    <List isLoading={isLoading}>
      {results.map((item: { metadata: { name: string }; spec: { public_addr: string } }, index: number) => {
        const name = item.metadata.name;
        const public_addr = item.spec.public_addr;

        return (
          <List.Item
            key={name + index}
            title={name}
            subtitle={public_addr}
            actions={
              <ActionPanel>
                <Action title="Open" onAction={() => open(name)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
