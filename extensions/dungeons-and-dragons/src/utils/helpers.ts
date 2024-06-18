export function rollDice(param: string): { rolls: number[]; total: number } {
  const diceRegex = /^(^| )((\d*)d(\d+|F)((?:\+|-)(\d+))?( desv| vent)?)(,|$)/;
  const match = param.match(diceRegex);
  if (match) {
    const numberOfRolls = Number(match[3]);
    const sides = Number(match[4]);
    const modifier = match[5] ? Number(match[5]) : 0;

    let total = 0;
    const rolls = [];
    for (let i = 0; i < numberOfRolls; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      total += roll;
      rolls.push(roll);
    }
    total += modifier;
    return { rolls, total };
  } else {
    return { rolls: [], total: 0 };
  }
}

export function flipCoin(times: number): { flips: string[]; result: string } {
  const flips = [];
  for (let i = 0; i < times; i++) {
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    flips.push(result);
  }
  const result = flips[times - 1];
  return { flips, result };
}
