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
  if (!data) return "";
  const names: string[] = data.map((monster) => monster.name);
  return names.join(", ");
}

export default function Command(props: LaunchProps<{ arguments: Arguments.RandomEncounter }>) {
  const { challengeLevel, location = "a random location", tone = "combat-heavy" } = props.arguments;

  if (!verifyChallengeLevel(challengeLevel)) {
    return <ChallengeRequired />;
  }

  if (!environment.canAccess(AI)) {
    return (
      <Detail
        isLoading={false}
        markdown={`# Access to Raycast AI is required\n## Please update to [Raycast Pro](https://www.raycast.com/pro) to unlock AI features in order to use the Random Encounter command.`}
      />
    );
  } else {
    const monsters = getDnd(`/api/monsters?challenge_rating=${challengeLevel}`) as monstersType;
    const monsterNames = getMonsterNames(monsters?.data?.results);

    const AICommand = `You are an expert and experienced Dungeons & Dragons (5th edition) Dungeon Master. You are preparing a session for your players and you need to generate a random chance encounter for your party to encounter. Here are the parameters of this challenge you should come up with: The Challenge Level/Rating of ${challengeLevel}, the tone of the encounter should be in the style of "${tone}", and a power level involving any of the following tonally-appropriate monsters: ${monsterNames}. Limit the total different types of monsters to five. If there is a single monster of a specific monster type, give it a Name that makes sense for the encounter. Your party is also located at: ${location}. Return a random encounter to use in your session as markdown. Come up with a creative title for your encounter as an H1. Provide a bulleted list of the monsters in this encounter at the bottom of the encounter. Give a list of tips for the actual GM to make this a fun and engaging encounter for the players. The final markdown should be structured in this way:
    # Encounter Title
    ## Description
    Medium-length description of the encounter. Avoid extraneous language, and provide enough information to paint a picture for the GM and players.
    Provide additional story-driven details for how the players can complete the above scenario.
    ## Monsters
    List of monsters in the encounter in a bulleted list
    ## Tips
    List of tips for the GM to make this encounter fun, challenging, engaging, and funny
    `;
    const { data, isLoading } = useAI(AICommand);

    if (monsters.isLoading) return <Detail isLoading={true} markdown="Loading monsters..." />;

    if (!monsters.data && monsters.isLoading === false)
      return (
        <Detail
          isLoading={true}
          markdown={`# There was an error loading your random encounter. \n Please try again with a different challenge level.`}
        />
      );

    return (
      <Detail
        isLoading={isLoading}
        markdown={
          (data ?? "") +
          `\n ${
            isLoading ? "Generating encounter..." : ""
          }\n --- \n ## Random Encounter parameters: \n - Challenge Level: ${challengeLevel} \n - Location: ${
            location ? location : "Random"
          } \n - Tone: ${tone ? tone : "Combat-heavy"}`
        }
      />
    );
  }
}
