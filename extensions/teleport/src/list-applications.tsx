import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getApplicationsList, connectToApplication } from "./utils";

async function open(name: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Connecting...",
  });

  try {
    await connectToApplication(name);
    toast.style = Toast.Style.Success;
    toast.title = "Success !";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failure !";
  }
}

export default function Command() {
  const { data, isLoading } = useCachedPromise(getApplicationsList);

  return (
    <List isLoading={isLoading}>
      {data?.map((item: { metadata: { name: string }; spec: { public_addr: string } }, index: number) => {
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
