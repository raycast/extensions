import { AI, Detail, environment, LaunchProps } from "@raycast/api";
import { useAI } from "@raycast/utils";
import { getDnd, verifyChallengeLevel } from "./utils/dndData";
import { index, indexCollection } from "./utils/types";
import ChallengeRequired from "./templates/challengeRequired";

interface monstersType {
  isLoading: boolean;
  data: indexCollection;
}

function getMonsterNames(data: index[]): string {
  const names: string[] = data.map((monster) => monster.name);
  return names.join(", ");
}

export default function Command(props: LaunchProps<{ arguments: Arguments.RandomEncounter }>) {
  const { challengeLevel, location } = props.arguments;

  if (!verifyChallengeLevel(challengeLevel)) {
    return <ChallengeRequired />;
  }

  const monsters = getDnd(`/api/monsters?challenge_rating=${challengeLevel}`) as monstersType;
  const monsterNames = getMonsterNames(monsters?.data?.results);

  const loc = location ?? "a random location";

  const AICommand = `You are an expert and experienced Dungeons & Dragons (5th edition) Dungeon Master. You are preparing a session for your players and you need to generate a random chance encounter for your party to encounter. Here are the parameters of this challenge you should come up with: The Challenge Level/Rating of ${challengeLevel}, and a power level involving any of the following monsters: ${monsterNames}. Limit the total different types of monsters to five. If there is a single monster of a specific monster type, give it a Name that makes sense for the encounter. Your party is also located at: ${loc}. Return a short random encounter to use in your session as markdown. Come up with a creative title for your encounter as an H1. Provide a bulleted list of the monsters in this encounter at the bottom of the encounter. Give a list of tips for the actual GM to make this a fun encounter. The final markdown should be structured in this way:
  # Encounter Title
  ## Description
  Medium-length description of the encounter. Avoid extraneous language, and provide enough information to paint a picture for the GM and players.
  ## Monsters
  List of monsters in the encounter in a bulleted list
  ## Tips
  List of tips for the GM to make this encounter fun, challenging, engaging, and funny
  `;

  if (!environment.canAccess(AI)) {
    return (
      <Detail
        isLoading={false}
        markdown={`# Access to AI in Raycast is required\n## Please update to Raycast Pro to unlock AI features to use `}
      />
    );
  } else {
    const { data, isLoading } = useAI(AICommand);
    return <Detail isLoading={isLoading} markdown={data} />;
  }
}
