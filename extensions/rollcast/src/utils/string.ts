import { Roll } from "types";
import { RollType } from "enums";

export const getSingleRollText = (roll: Roll) => `${roll[0]}`;

export const getTypeText = (type?: RollType) =>
  type ? ` - w/ ${type === RollType.ADVANTAGE ? "advantage" : "disadvantage"}` : "";

export const getRollText = (roll: Roll, type?: RollType) => {
  const [, rolls] = roll;
  if (rolls.length === 1) {
    return getSingleRollText(roll);
  }

  const resultText = getSingleRollText(roll);
  const rollsText = rolls.join(", ");
  const typeText = getTypeText(type);
  return `${resultText} - [${rollsText}${typeText}]`;
};
