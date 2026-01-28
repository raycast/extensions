import { RollType } from "enums";
import { Roll, RollOptions } from "types";

export const getRandomNumber = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export const roll = ({ times, die, type }: RollOptions): [number, Roll[]] => {
  const rollTimes = times || 1;
  const rolls: Roll[] = [];

  for (let i = 1; i <= rollTimes; i++) {
    rolls.push(rollOnce({ die, type }));
  }

  const result = getRollsTotal(rolls);

  return [result, rolls];
};

export const getRollsTotal = (rolls: Roll[]) => {
  return unpackRolls(rolls).reduce((result, a) => result + a);
};

export const unpackRolls = (rolls: Roll[]) => {
  return rolls.map((roll) => {
    const [result] = roll;

    return result;
  });
};

export const rollWithType = (die: number, type: RollType): Roll => {
  const method = type === RollType.ADVANTAGE ? "max" : "min";
  const rolls = [rollDie(die), rollDie(die)];

  const result = Math[method](...rolls);

  return [result, rolls];
};

export const rollDie = (die: number) => getRandomNumber(1, die);

export const rollOnce = ({ die, type }: RollOptions): Roll => {
  if (type) {
    return rollWithType(die, type);
  }

  const result = rollDie(die);

  return [result, [result]];
};
