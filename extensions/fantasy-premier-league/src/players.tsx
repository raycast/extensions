import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { SITE } from "./api/fpl";
import { PlayerDetail } from "./components/PlayerDetail";
import { useBootstrap, useMySquad } from "./hooks";
import { positionShort, teamBadgeUrl } from "./lib/bootstrap";
import { formatPrice, statusColor } from "./lib/format";

type Sort = "total_points" | "form" | "now_cost" | "selected_by_percent" | "ep_next";

const sortLabels: Record<Sort, string> = {
  total_points: "Total points",
  form: "Form",
  ep_next: "Expected points next GW",
  now_cost: "Price",
  selected_by_percent: "Ownership",
};

export default function Command() {
  const { data, index, isLoading } = useBootstrap();
  const squad = useMySquad();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<Sort>("total_points");

  const players = (data?.elements ?? [])
    .filter((p) => filter === "all" || (filter === "mine" ? squad?.has(p.id) : String(p.element_type) === filter))
    .sort((a, b) => Number(b[sort]) - Number(a[sort]));

  const sortMenu = (
    <ActionPanel.Submenu title="Sort by" icon={Icon.ArrowDown} shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}>
      {(Object.keys(sortLabels) as Sort[]).map((key) => (
        <Action
          key={key}
          title={sortLabels[key]}
          icon={key === sort ? Icon.Checkmark : Icon.Circle}
          onAction={() => setSort(key)}
        />
      ))}
    </ActionPanel.Submenu>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search players · sorted by ${sortLabels[sort].toLowerCase()}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Position" value={filter} onChange={setFilter}>
          <List.Dropdown.Item value="all" title="All players" />
          <List.Dropdown.Item value="mine" title="My squad" />
          {data?.element_types.map((t) => (
            <List.Dropdown.Item key={t.id} value={String(t.id)} title={t.plural_name} />
          ))}
        </List.Dropdown>
      }
    >
      {index &&
        players.map((player) => {
          const team = index.teams.get(player.team);
          return (
            <List.Item
              key={player.id}
              icon={team ? { source: teamBadgeUrl(team), fallback: Icon.Person } : Icon.Person}
              title={player.web_name}
              subtitle={`${positionShort(index, player.element_type)} · ${team?.short_name ?? ""}`}
              keywords={[player.first_name, player.second_name, team?.name ?? "", team?.short_name ?? ""]}
              accessories={[
                ...(squad?.has(player.id) ? [{ icon: Icon.Star, tooltip: "In your squad" }] : []),
                ...(player.status !== "a"
                  ? [
                      {
                        icon: { source: Icon.ExclamationMark, tintColor: statusColor(player.status) },
                        tooltip: player.news,
                      },
                    ]
                  : []),
                { text: formatPrice(player.now_cost), tooltip: "Price" },
                { text: `${player.selected_by_percent}%`, tooltip: "Ownership" },
                { text: `Form ${player.form}`, tooltip: "Form" },
                { tag: { value: `${player.total_points} pts`, color: Color.SecondaryText }, tooltip: "Total points" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Player Details"
                    icon={Icon.Sidebar}
                    target={<PlayerDetail player={player} index={index} />}
                  />
                  <Action.OpenInBrowser title="Open Statistics on FPL" url={`${SITE}/statistics`} />
                  {sortMenu}
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
