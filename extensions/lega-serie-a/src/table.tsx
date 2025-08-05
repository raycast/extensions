import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import SeasonDropdown, { seasons } from "./components/season_dropdown";
import { getStandings } from "./api";
import { Standing } from "./types";

export default function GetTables() {
  const [standing, setStandings] = useState<Standing[]>();
  const [season, setSeason] = useState<string>(seasons[0]);
  const [showStats, setShowStats] = useState<boolean>(false);

  useEffect(() => {
    if (season) {
      setStandings(undefined);
      getStandings(season).then((data) => {
        setStandings(data);
      });
    }
  }, [season]);

  return (
    <List
      throttle
      isLoading={!standing}
      searchBarAccessory={
        <SeasonDropdown selected={season} onSelect={setSeason} />
      }
      isShowingDetail={showStats}
    >
      {standing?.map((team) => {
        const accessories: List.Item.Accessory[] = [
          {
            text: {
              color: Color.PrimaryText,
              value: team.PuntiCls.toString(),
            },
            tooltip: "Points",
          },
        ];

        if (!showStats) {
          accessories.unshift(
            {
              icon: Icon.SoccerBall,
              text: team.Giocate.toString(),
              tooltip: "Played",
            },
            {
              icon: Icon.Goal,
              text: `${team.RETIFATTE} - ${team.RETISUBITE}`,
              tooltip: "Goals For - Goals Against",
            },
          );
        }

        return (
          <List.Item
            key={team.Nome}
            icon={team.team_image}
            title={team.PosCls.toString()}
            subtitle={team.Nome}
            keywords={[team.Nome, team.NomeCompleto, team.NomeSintetico]}
            accessories={accessories}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Stats" />
                    <List.Item.Detail.Metadata.Label
                      title="Previous Position"
                      text={team.Perse.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Played"
                      text={team.Giocate.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Won"
                      text={team.Vinte.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Drawn"
                      text={team.Pareggiate.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Lost"
                      text={team.Perse.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals For"
                      text={team.RETIFATTE.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goals Against"
                      text={team.RETISUBITE.toString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Goal Difference"
                      text={(team.RETIFATTE - team.RETISUBITE).toString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Show Stats"
                  icon={Icon.Sidebar}
                  onAction={() => {
                    setShowStats(!showStats);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
