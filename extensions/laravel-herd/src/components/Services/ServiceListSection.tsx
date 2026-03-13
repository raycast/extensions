import { List, ActionPanel, Icon, Action } from "@raycast/api";
import { InstalledService } from "../../lib/types/service";
import { Herd } from "../../utils/Herd";
import { useServiceState } from "../../hooks/useServiceState";
import { rescue } from "../../utils/rescue";

type Props = {
  category: string;
  services: InstalledService[];
  actions: ReturnType<typeof useServiceState>["actions"];
};

export function ServiceListSection({ category, services, actions }: Props) {
  return (
    <List.Section title={category} key={category}>
      {services.map((installedService) => {
        return (
          <List.Item
            key={`${installedService.name}_${installedService.port}`}
            title={installedService.name}
            accessories={actions.getAccessories(installedService)}
            actions={
              <ActionPanel title={installedService.name}>
                {installedService.apps.map((app) => {
                  return (
                    <Action
                      key={app.name}
                      title={`${app.action} with ${app.name}`}
                      icon={Herd.ExternalApps.getIcon(app)}
                      onAction={async () => {
                        await rescue(
                          () => Herd.ExternalApps.openService(app, installedService),
                          "Failed to open service.",
                        );
                      }}
                    />
                  );
                })}
                <ActionPanel.Section key="config-section" title="Config">
                  <Action.CopyToClipboard
                    key="copy-env"
                    title="Copy .env"
                    shortcut={{ modifiers: ["opt"], key: "e" }}
                    content={installedService.env}
                  />

                  <Action
                    key="toggle-service"
                    title={(installedService.status === "active" ? "Stop" : "Start") + ` ${installedService.name}`}
                    icon={installedService.status === "active" ? Icon.Stop : Icon.Play}
                    onAction={() => {
                      actions.toggleServiceStatus(installedService);
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={actions.getDetailMarkdown(installedService)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Type" text={installedService.type} />
                    <List.Item.Detail.Metadata.Label title="Port" text={installedService.port} />
                    <List.Item.Detail.Metadata.Label title="Version" text={installedService.version} />

                    <List.Item.Detail.Metadata.Link
                      title="Documentation"
                      target={installedService.documentation}
                      text="Open"
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List.Section>
  );
}
