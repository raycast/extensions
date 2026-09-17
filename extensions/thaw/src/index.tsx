import { DIRECT_THAW_ACTIONS, SETTINGS_THAW_ACTIONS, type ThawAction } from "@data";
import { Action, ActionPanel, Color, List, Toast, open, showToast } from "@raycast/api";
import { THAW_INSTALL_URL, buildThawUrl, isThawInstalled, openThawUrl } from "@utils";
import { useEffect, useState } from "react";

function ActionItem({ action }: Readonly<{ action: ThawAction }>) {
  const url = buildThawUrl(action.action, action.query);

  return (
    <List.Item
      title={action.title}
      subtitle={action.subtitle}
      icon={action.icon}
      accessories={
        action.requiresSettingsURI ? [{ tag: { value: "Settings URI", color: Color.SecondaryText } }] : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Run Action"
            icon={action.icon}
            onAction={async () => {
              await openThawUrl(action.action, action.successMessage, action.query);
            }}
          />
          <Action.CopyToClipboard title="Copy Thaw URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CreateQuicklink
            title="Create Quicklink"
            quicklink={{ name: `Thaw: ${action.title}`, link: url }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    isThawInstalled().then((result: boolean) => {
      setInstalled(result);
      if (!result) {
        showToast({
          style: Toast.Style.Failure,
          title: "Thaw Not Installed",
          message: "Get it at github.com/stonerl/Thaw",
          primaryAction: {
            title: "Open GitHub Page",
            onAction: () => open(THAW_INSTALL_URL),
          },
        });
      }
    });
  }, []);

  return (
    <List isLoading={installed === null} searchBarPlaceholder="Search for an action...">
      {installed === false ? (
        <List.EmptyView title="Thaw Not Installed" description={`Get Thaw from ${THAW_INSTALL_URL}`} />
      ) : (
        <>
          <List.Section title="Actions">
            {DIRECT_THAW_ACTIONS.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </List.Section>
          <List.Section title="Settings URI" subtitle="Enable in Thaw → Automation, then Authorize Raycast">
            {SETTINGS_THAW_ACTIONS.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
