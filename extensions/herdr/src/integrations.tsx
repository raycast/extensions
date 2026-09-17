import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { agentIcon, agentTitle } from "./lib/agent-appearance";
import { runHerdr } from "./lib/herdr";
import { parseIntegrationStatus } from "./lib/parsers";
import { runAction, shortcuts } from "./lib/ui";

async function getIntegrations() {
  const output = await runHerdr(["integration", "status"]);
  return parseIntegrationStatus(output);
}

function integrationColor(status: string): Color {
  if (status === "current") return Color.Green;
  if (status === "outdated") return Color.Orange;
  return Color.SecondaryText;
}

function integrationStatusTitle(status: string): string {
  return status.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Command() {
  const integrations = useCachedPromise(getIntegrations, [], { keepPreviousData: true });

  async function uninstall(name: string) {
    if (
      !(await confirmAlert({
        title: `Uninstall ${name} integration?`,
        message:
          "Herdr may fall back to screen detection and lose native session restore or lifecycle updates for this agent.",
        primaryAction: { title: "Uninstall Integration", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    await runAction(`Uninstalling ${name}`, () => runHerdr(["integration", "uninstall", name]).then(() => undefined), {
      success: `${name} Integration Removed`,
      onSuccess: integrations.revalidate,
    });
  }

  return (
    <List isLoading={integrations.isLoading} searchBarPlaceholder="Search supported agent integrations…">
      <List.EmptyView
        icon={Icon.Link}
        title="No Integrations Reported"
        description="Update Herdr to a version that supports integration status."
      />
      {(integrations.data || []).map((integration) => (
        <List.Item
          key={integration.name}
          icon={agentIcon(integration.name)}
          title={agentTitle(integration.name)}
          subtitle={integration.detail}
          keywords={[integration.name]}
          accessories={[
            { tag: { value: integrationStatusTitle(integration.status), color: integrationColor(integration.status) } },
          ]}
          actions={
            <ActionPanel>
              {integration.status !== "current" ? (
                <Action
                  title={integration.status === "outdated" ? "Update Integration" : "Install Integration"}
                  icon={Icon.Download}
                  onAction={() =>
                    runAction(
                      `Installing ${integration.name}`,
                      () => runHerdr(["integration", "install", integration.name]).then(() => undefined),
                      {
                        success: `${integration.name} Integration Installed`,
                        onSuccess: integrations.revalidate,
                      },
                    )
                  }
                />
              ) : null}
              {integration.status !== "not installed" ? (
                <Action
                  title="Reinstall Integration"
                  icon={Icon.ArrowClockwise}
                  onAction={() =>
                    runAction(
                      `Reinstalling ${integration.name}`,
                      () => runHerdr(["integration", "install", integration.name]).then(() => undefined),
                      {
                        success: `${integration.name} Integration Reinstalled`,
                        onSuccess: integrations.revalidate,
                      },
                    )
                  }
                />
              ) : null}
              {integration.status !== "not installed" ? (
                <Action
                  title="Uninstall Integration"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={shortcuts.delete}
                  onAction={() => uninstall(integration.name)}
                />
              ) : null}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={shortcuts.refresh}
                onAction={integrations.revalidate}
              />
              <Action.OpenInBrowser title="Open Integration Documentation" url="https://herdr.dev/docs/integrations/" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
