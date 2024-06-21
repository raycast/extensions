import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { usePlanetCampaigns } from "./hooks/usePlanetCampaigns";
import { useState } from "react";
import { getProgressIcon } from "@raycast/utils";
import { factions } from "./data/factions";

export default function Command() {
  const { isLoading, campaigns } = usePlanetCampaigns();
  const [showingDetail, setShowingDetail] = useState(false);

  const formatter = Intl.NumberFormat("en", { notation: "compact" });

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {campaigns &&
        campaigns.reverse().map((planet) => {
          const progress = (planet.info.maxHealth - planet.status.health) / planet.info.maxHealth;

          return (
            <List.Item
              icon={getProgressIcon(progress, Color.Blue, {
                background: [Color.Blue, Color.Yellow, Color.Red][planet.status.owner - 1],
              })}
              key={planet.planetIndex}
              id={planet.planetIndex.toString()}
              title={planet.planet.name}
              subtitle={planet.planet.sector}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Owner"
                        text={factions[planet.status.owner.toString()]}
                        icon={`${planet.status.owner}.png`}
                      />
                      <List.Item.Detail.Metadata.Label title="Sector" text={planet.planet.sector} />
                      <List.Item.Detail.Metadata.Label title="Players" text={planet.status.players.toLocaleString()} />
                      <List.Item.Detail.Metadata.Label title="Event Type" text={planet.campaignType} />
                      <List.Item.Detail.Metadata.Label
                        title="Event Progress"
                        text={`${(progress * 100).toFixed(2)}%`}
                        icon={getProgressIcon(progress, Color.Blue)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Health"
                        text={(planet.info.maxHealth - planet.status.health).toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Regen Per/Sec"
                        text={planet.status.regenPerSecond.toFixed(2)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Regen Per/Hour"
                        text={`${((planet.status.regenPerSecond * 360000) / planet.info.maxHealth).toFixed(2)}%`}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Missions Win"
                        text={planet.stats.missionsWon.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Missions Lost"
                        text={planet.stats.missionsLost.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Helldivers Deaths"
                        text={planet.stats.deaths.toLocaleString()}
                        icon="1.png"
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Terminids Deaths"
                        text={planet.stats.bugKills.toLocaleString()}
                        icon="2.png"
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Automaton Deaths"
                        text={planet.stats.automatonKills.toLocaleString()}
                        icon="3.png"
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Illuminate Deaths"
                        text={planet.stats.illuminateKills.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Shots Fired"
                        text={planet.stats.bulletsFired.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Shots Hit"
                        text={planet.stats.bulletsHit.toLocaleString()}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Friendly Shots"
                        text={planet.stats.friendlies.toLocaleString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              accessories={[
                {
                  text: { value: planet.status.players.toLocaleString(), color: Color.Yellow },
                  icon: { source: Icon.Person, tintColor: Color.Yellow },
                },
                {
                  text: { value: formatter.format(planet.info.maxHealth - planet.status.health), color: Color.Red },
                  icon: { source: Icon.Heart, tintColor: Color.Red },
                },
              ]}
              actions={
                <ActionPanel>
                  {/* <Action.OpenInBrowser url={`https://www.pokemon.com/us/pokedex/${pokemon.name}`} /> */}
                  <Action title="Toggle Detail" onAction={() => setShowingDetail(!showingDetail)} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
