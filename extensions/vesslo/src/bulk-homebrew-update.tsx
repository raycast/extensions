import {
  Action,
  ActionPanel,
  Icon,
  List,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useMemo } from "react";

import { normalizeBrewCaskToken } from "./utils/brew";
import { useVessloData } from "./utils/useVessloData";
import {
  openUpdateInVesslo,
  runBrewUpgrade,
  runBrewUpgradeInTerminal,
  runBulkBrewUpgrade,
} from "./utils/actions";
import { isHomebrewUpdateCandidate } from "./utils/update-filter";

export default function BulkHomebrewUpdate() {
  const { data, isLoading } = useVessloData();
  const [isUpdating, setIsUpdating] = useState(false);

  const homebrewAppsWithUpdates = useMemo(() => {
    if (!data) return [];
    return data.apps.filter((app) => isHomebrewUpdateCandidate(app));
  }, [data]);

  const uniqueCaskTokens = useMemo(
    () =>
      Array.from(
        new Set(
          homebrewAppsWithUpdates
            .map((app) => normalizeBrewCaskToken(app.homebrewCask))
            .filter((caskName): caskName is string => caskName !== null),
        ),
      ),
    [homebrewAppsWithUpdates],
  );

  async function updateAllDirect() {
    if (uniqueCaskTokens.length === 0) return;

    const confirmed = await confirmAlert({
      title: "Update All Homebrew Apps",
      message: `This will update ${uniqueCaskTokens.length} unique Homebrew cask(s) from Vesslo's visible update export. Continue?`,
      primaryAction: { title: "Update All", style: Alert.ActionStyle.Default },
      dismissAction: { title: "Cancel" },
    });

    if (!confirmed) return;

    setIsUpdating(true);

    try {
      await runBulkBrewUpgrade(uniqueCaskTokens);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <List isLoading={isLoading || isUpdating}>
      {!data ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Vesslo data not found"
          description="Please run Vesslo app to export data"
        />
      ) : homebrewAppsWithUpdates.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="All Homebrew apps are up to date!"
          description="No Homebrew updates available"
        />
      ) : (
        <>
          <List.Section
            title={`Homebrew Updates (${homebrewAppsWithUpdates.length})`}
          >
            {/* Update All item */}
            <List.Item
              icon={{ source: Icon.ArrowDown, tintColor: Color.Green }}
              title="Update All Homebrew Apps"
              subtitle={`${homebrewAppsWithUpdates.length} apps • ${uniqueCaskTokens.length} unique casks`}
              accessories={[{ tag: { value: "BULK", color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Recommended">
                    <Action
                      title="Quick Update All (Direct)"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      onAction={updateAllDirect}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Individual Apps">
            {homebrewAppsWithUpdates.map((app) => {
              const caskToken = normalizeBrewCaskToken(app.homebrewCask);

              return (
                <List.Item
                  key={app.id}
                  icon={
                    app.icon
                      ? { source: `data:image/png;base64,${app.icon}` }
                      : Icon.AppWindow
                  }
                  title={app.name}
                  subtitle={app.developer ?? ""}
                  accessories={[
                    { text: `${app.version} → ${app.targetVersion}` },
                    { tag: { value: "brew", color: Color.Orange } },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Recommended">
                        {app.bundleId && (
                          <Action
                            title="Update in Vesslo"
                            icon={Icon.Download}
                            onAction={() => openUpdateInVesslo(app.bundleId!)}
                          />
                        )}
                      </ActionPanel.Section>
                      {caskToken && (
                        <ActionPanel.Section title="Alternative">
                          <Action
                            title="Quick Update (Direct)"
                            icon={Icon.ArrowDown}
                            shortcut={{
                              modifiers: ["cmd", "shift"],
                              key: "enter",
                            }}
                            onAction={() => runBrewUpgrade(caskToken, app.name)}
                          />
                          <Action
                            title="Update Via Terminal"
                            icon={Icon.Terminal}
                            shortcut={{
                              modifiers: ["cmd", "shift"],
                              key: "t",
                            }}
                            onAction={() => runBrewUpgradeInTerminal(caskToken)}
                          />
                        </ActionPanel.Section>
                      )}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
