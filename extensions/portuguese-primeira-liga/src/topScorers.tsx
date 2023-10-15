import { Image, List } from "@raycast/api";
import useTopScorers from "./hooks/useTopScorers";

export default function GetTopScorers() {
  const topScorers = useTopScorers();
  let position = 0;

  return (
    <List isLoading={!topScorers}>
      {topScorers?.map((ts) => {
        position += 1;
        return (
          <List.Item
            key={ts.player.name}
            title={position.toString()}
            subtitle={ts.player.name.toString()}
            icon={{
              source: `${ts.team.crest}`,
              mask: Image.Mask.Circle,
              fallback: "default.png",
            }}
            accessories={[{ text: ts.goals.toString() }]}
          />
        );
      })}
    </List>
  );
}
