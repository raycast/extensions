import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { connectToPIA, disconnectFromPIA, getPIACurrentRegion, getPIARegions } from "./utils";
import { Region } from "./types";

export default function Command() {
  const { isLoading, data: regions } = useCachedPromise(async () => {
    return await getPIARegions();
  });
  const { data: currentRegion, revalidate: reloadCurrentRegion } = useCachedPromise(async () => {
    return await getPIACurrentRegion();
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search regions...">
      {regions?.map((item: Region, index: number) => {
        const currentlyConnected = currentRegion === item.name;
        const connectedKeyword = currentlyConnected ? "Connected" : "";
        return (
          <List.Item
            key={index}
            title={item.title}
            accessories={[
              {
                ...(currentlyConnected && { tag: { value: "Connected", color: "green" } }),
                icon: currentlyConnected ? Icon.Checkmark : undefined,
              },
            ]}
            keywords={[item.name, item.title, connectedKeyword]}
            actions={
              <ActionPanel>
                {!currentlyConnected && (
                  <Action
                    title="Connect"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={async () => {
                      await connectToPIA(item.name);
                      reloadCurrentRegion();
                    }}
                  />
                )}
                {currentlyConnected && (
                  <Action
                    title="Disconnect"
                    icon={Icon.Xmark}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      await disconnectFromPIA();
                      reloadCurrentRegion();
                    }}
                  />
                )}
                <Action.CopyToClipboard title="Copy Region Name" content={item.name} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
