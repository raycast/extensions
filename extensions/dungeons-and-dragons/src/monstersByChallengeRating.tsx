import { List, LaunchProps } from "@raycast/api";
import { getDnd, verifyChallengeLevel } from "./utils/dndData";
import { index, indexCollection } from "./utils/types";
import MonsterListDetail from "./templates/monsterListDetail";
import ChallengeRequired from "./templates/challengeRequired";
interface monstersType {
  isLoading: boolean;
  data: indexCollection;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.MonstersByChallengeRating }>) {
  const { challengeLevel } = props.arguments;

  if (!verifyChallengeLevel(challengeLevel)) {
    return <ChallengeRequired />;
  }

  const monsters = getDnd(`/api/monsters?challenge_rating=${challengeLevel}`) as monstersType;

  if (monsters?.data) {
    return (
      <List throttle={true} filtering={true} isShowingDetail isLoading={monsters.isLoading}>
        {monsters?.data.results?.map((monster: index) => (
          <MonsterListDetail key={monster.index} index={monster.index} name={monster.name} url={monster.url} />
        ))}
      </List>
    );
  }
}
