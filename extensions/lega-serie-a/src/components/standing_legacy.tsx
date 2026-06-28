import { Color, List } from "@raycast/api";
import { Standing } from "../types";

export default function StandingLegacy(props: {
  standing: Standing[] | undefined;
}) {
  return props.standing?.map((team) => {
    const accessories: List.Item.Accessory[] = [
      {
        text: {
          color: Color.PrimaryText,
          value: String(team.PuntiCls),
        },
        tooltip: "Points",
      },
    ];

    return (
      <List.Item
        key={team.Nome}
        icon={{
          source: {
            light: team.team_image,
            dark: team.team_image_secondary,
          },
        }}
        title={String(team.PosCls)}
        subtitle={team.Nome}
        keywords={[team.Nome, team.NomeCompleto, team.NomeSintetico]}
        accessories={accessories}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Played"
                  text={String(team.Giocate)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Won"
                  text={String(team.Vinte)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Drawn"
                  text={String(team.Pareggiate)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Lost"
                  text={String(team.Perse)}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Goals For"
                  text={String(team.RETIFATTE)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Goals Against"
                  text={String(team.RETISUBITE)}
                />
                <List.Item.Detail.Metadata.Label
                  title="Goal Difference"
                  text={String(team.RETIFATTE - team.RETISUBITE)}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  });
}
