import { Color, Image, List } from "@raycast/api";
import useStandings from "./hooks/useStandings";

export default function GetStandings() {
  const standings = useStandings();

  return (
    <List throttle isLoading={!standings}>
      {standings?.map((table) => {
        return (
          <List.Item
            key={table.position}
            title={`${table.position}. ${table.team.name}`}
            icon={{
              source: `${table.team.crest}`,
              mask: Image.Mask.Circle,
              fallback: "default.png",
            }}
            subtitle={`${table.team.tla}`}
            accessories={[
              { text: `W: ${table.won}` },
              { text: `D: ${table.draw}` },
              { text: `L: ${table.lost}` },
              { text: `GF: ${table.goalsFor}` },
              { text: `GA: ${table.goalsAgainst}` },
              { text: `GD: ${table.goalDifference}` },
              { text: `Points: ${table.points}` },
            ]}
          />
        );
      })}
    </List>
  );
}
