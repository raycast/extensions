import { ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { listVersions } from "../utils/mods";
import { timestampToLongUTCDate } from "../utils/helpers";
import { CopyVersionAction, InstallModAction, RefreshAction } from "./Actions";

export default function ModVersionsList({ id }: { id: string }) {
  const {
    data: versions,
    isLoading,
    error,
    revalidate,
  } = usePromise(async () => {
    return await listVersions(id);
  });

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFailureToast(message, { title: `Failed to load versions for ${id}` });
  }

  return (
    <List isLoading={isLoading}>
      {versions?.toReversed().map((ver, index) => (
        <List.Item
          key={ver?.version ?? ""}
          icon={Icon.Box}
          title={ver?.version ?? ""}
          subtitle={index === 0 ? "Latest" : undefined}
          accessories={[
            ...(ver?.isPreRelease ? [{ icon: Icon.WrenchScrewdriver, text: "Pre Release" }] : []),
            {
              icon: Icon.Calendar,
              tag: new Date(ver?.timestamp * 1000),
              tooltip: timestampToLongUTCDate(ver?.timestamp * 1000),
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <InstallModAction id={id} version={ver?.version} actionTitle="Install Version" />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CopyVersionAction version={ver?.version} shortcut={Keyboard.Shortcut.Common.Copy} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <RefreshAction revalidate={revalidate} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
