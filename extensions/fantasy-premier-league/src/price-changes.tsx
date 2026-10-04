import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ReactNode, useState } from "react";
import { transfersUrl } from "./api/fpl";
import type { Player } from "./api/types";
import { PlayerDetail } from "./components/PlayerDetail";
import { useBootstrap, useMySquad } from "./hooks";
import { BootstrapIndex, positionShort, teamBadgeUrl } from "./lib/bootstrap";
import { formatNumber, formatPrice, formatPriceDelta, likelihoodColor, likelihoodLabel } from "./lib/format";

const LIMIT = 25;

export default function Command() {
  const { data, index, isLoading } = useBootstrap();
  const squad = useMySquad();
  const [scope, setScope] = useState("all");
  const [reversed, setReversed] = useState(false);

  const progress = (p: Player) => Number(p.price_change_percent);
  // Most likely to rise first, most likely to fall last; cmd-R flips it.
  const players = (data?.elements ?? [])
    .filter((p) => (scope === "changed" ? p.cost_change_event !== 0 : progress(p) !== 0))
    .filter((p) => scope !== "mine" || squad?.has(p.id))
    .sort((a, b) => (reversed ? progress(a) - progress(b) : progress(b) - progress(a)));
  const rows = scope === "all" ? [...players.slice(0, LIMIT), ...players.slice(-LIMIT)] : players;

  const reverseAction = (
    <Action
      title={reversed ? "Show Risers First" : "Show Fallers First"}
      icon={Icon.Switch}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      onAction={() => setReversed((r) => !r)}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={reversed ? "Most likely to fall first" : "Most likely to rise first"}
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" value={scope} onChange={setScope}>
          <List.Dropdown.Item value="all" title="All players" />
          <List.Dropdown.Item value="mine" title="My squad" />
          <List.Dropdown.Item value="changed" title="Changed this gameweek" />
        </List.Dropdown>
      }
    >
      {index && (
        <List.Section
          title={scope === "changed" ? "Changed this gameweek" : "Price movers"}
          subtitle={scope === "all" ? `Top ${LIMIT} each way · progress towards ±£0.1m` : "Progress towards ±£0.1m"}
        >
          {[...new Map(rows.map((p) => [p.id, p])).values()].map((p) => (
            <PriceItem key={p.id} player={p} index={index} owned={squad?.has(p.id)}>
              {reverseAction}
            </PriceItem>
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface PriceItemProps {
  player: Player;
  index: BootstrapIndex;
  owned?: boolean;
  children: ReactNode;
}

function PriceItem({ player, index, owned, children }: PriceItemProps) {
  const team = index.teams.get(player.team);
  const tonight = player.price_change_projections?.[0];
  const progress = Number(player.price_change_percent);
  const net = player.transfers_in_event - player.transfers_out_event;

  return (
    <List.Item
      icon={team ? { source: teamBadgeUrl(team), fallback: Icon.Person } : Icon.Person}
      title={player.web_name}
      subtitle={`${positionShort(index, player.element_type)} · ${team?.short_name ?? ""} · ${formatPrice(player.now_cost)}`}
      keywords={[player.first_name, player.second_name, team?.name ?? ""]}
      accessories={[
        ...(owned ? [{ icon: Icon.Star, tooltip: "In your squad" }] : []),
        ...(player.cost_change_event
          ? [
              {
                tag: {
                  value: formatPriceDelta(player.cost_change_event),
                  color: player.cost_change_event > 0 ? Color.Green : Color.Red,
                },
                tooltip: "Change this gameweek",
              },
            ]
          : []),
        {
          text: `${net >= 0 ? "+" : ""}${formatNumber(net)}`,
          tooltip: `Net transfers this GW (in ${formatNumber(player.transfers_in_event)}, out ${formatNumber(player.transfers_out_event)})`,
        },
        ...(player.price_change_locked_until
          ? [{ icon: Icon.Lock, tooltip: `Locked until ${player.price_change_locked_until}` }]
          : []),
        { text: `${progress.toFixed(0)}%`, tooltip: "Progress towards next price change" },
        ...(tonight
          ? [
              {
                tag: {
                  value: `Tonight: ${likelihoodLabel(tonight.likelihood)}`,
                  color: likelihoodColor(tonight.likelihood),
                },
                tooltip: `Projected ${tonight.projected_percent}% by tonight`,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Player Details"
            icon={Icon.Sidebar}
            target={<PlayerDetail player={player} index={index} />}
          />
          <Action.OpenInBrowser title="Open Transfers on FPL" url={transfersUrl} />
          {children}
        </ActionPanel>
      }
    />
  );
}
