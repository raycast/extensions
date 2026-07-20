import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import { MakeClient, presentMakeApiError } from "./make-api";
import { toScenarioEditUrl } from "./make-browser-url";
import { ScenarioDetail } from "./scenario-detail";
import {
  addFavorite,
  getFavorites,
  getSelection,
  isFavorite,
  removeFavorite,
} from "./storage";
import type {
  GetScenarioResponse,
  ListScenarioConsumptionsResponse,
  MakeScenario,
  ScenarioConsumption,
} from "./types";

export default function ListFavoriteScenariosCommand() {
  const prefs = getPreferenceValues<Preferences.ListFavoriteScenarios>();
  const client = useMemo(
    () => new MakeClient({ baseUrl: prefs.baseUrl, apiToken: prefs.apiToken }),
    [prefs.baseUrl, prefs.apiToken],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [scenarios, setScenarios] = useState<MakeScenario[]>([]);
  const [consumptionsByScenarioId, setConsumptionsByScenarioId] = useState<
    Record<number, ScenarioConsumption>
  >({});
  const [lastReset, setLastReset] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const [sel, favIds] = await Promise.all([
          getSelection(),
          getFavorites(),
        ]);
        if (cancelled) return;
        setFavorites(favIds);

        if (!sel || favIds.length === 0) {
          setScenarios([]);
          setTeamId(sel?.teamId ?? null);
          setIsLoading(false);
          return;
        }

        setTeamId(sel.teamId);

        // Fetch scenarios in parallel
        const results = await Promise.allSettled(
          favIds.map((id) =>
            client.getJson<GetScenarioResponse>(`/api/v2/scenarios/${id}`),
          ),
        );

        if (cancelled) return;

        const fetched: MakeScenario[] = [];
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.scenario) {
            fetched.push(r.value.scenario);
          }
        }
        setScenarios(fetched);

        // Fetch consumptions
        try {
          const consumptions =
            await client.getJson<ListScenarioConsumptionsResponse>(
              "/api/v2/scenarios/consumptions",
              { teamId: sel.teamId },
            );
          if (cancelled) return;
          const map: Record<number, ScenarioConsumption> = {};
          for (const c of consumptions.scenarioConsumptions ?? [])
            map[c.scenarioId] = c;
          setConsumptionsByScenarioId(map);
          setLastReset(consumptions.lastReset ?? null);
        } catch {
          // consumptions are optional
        }
      } catch (e) {
        if (!cancelled)
          await presentMakeApiError(e, "Failed to load favorites");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [client, refreshKey]);

  async function toggleFavorite(id: number) {
    if (isFavorite(id, favorites)) {
      await removeFavorite(id);
      setFavorites((prev) => prev.filter((f) => f !== id));
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    } else {
      await addFavorite(id);
      setFavorites((prev) => [...prev, id]);
    }
  }

  const sorted = useMemo(
    () => [...scenarios].sort((a, b) => a.name.localeCompare(b.name)),
    [scenarios],
  );

  if (!isLoading && favorites.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Favorite Scenarios"
          description="Use the main List Scenarios command and press ⌘⇧F on a scenario to add it to favorites."
          icon={Icon.Star}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search favorite scenarios…"
    >
      <List.Section
        title="Favorites"
        subtitle={`${sorted.length} scenario${sorted.length === 1 ? "" : "s"}`}
      >
        {sorted.map((s) => {
          const ops = consumptionsByScenarioId[s.id]?.operations;
          const opsText = typeof ops === "number" ? `${ops}` : "—";
          const statusText = s.isActive ? "Live" : "Disabled";
          const browserScenarioUrl =
            teamId != null
              ? toScenarioEditUrl(prefs.baseUrl, teamId, s.id)
              : "";

          return (
            <List.Item
              key={s.id}
              title={s.name}
              subtitle={statusText}
              icon={s.isActive ? Icon.Play : Icon.Pause}
              accessories={[
                { icon: Icon.Star },
                { text: opsText },
                ...(s.lastEdit ? [{ date: new Date(s.lastEdit) }] : []),
              ]}
              actions={
                <ActionPanel>
                  {teamId != null && (
                    <Action.Push
                      title="Show Details"
                      target={
                        <ScenarioDetail
                          client={client}
                          baseUrl={prefs.baseUrl}
                          teamId={teamId}
                          scenarioId={s.id}
                          initialScenario={s}
                          consumptionOperations={
                            typeof ops === "number" ? ops : null
                          }
                          lastReset={lastReset}
                        />
                      }
                    />
                  )}
                  {browserScenarioUrl && (
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={browserScenarioUrl}
                    />
                  )}
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    onAction={() => void toggleFavorite(s.id)}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => setRefreshKey((k) => k + 1)}
                    />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
