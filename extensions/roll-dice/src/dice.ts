import { randomInt } from "node:crypto";

export type DiceGroup = {
  /** Original text of this term, e.g. "2d10+1". */
  notation: string;
  count: number;
  sides: number;
  /** Sum of the modifiers attached to this term. */
  modifier: number;
};

export type DiceTerm = DiceGroup | { notation: string; constant: number };

export type GroupResult = {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
};

export type RollResult = {
  groups: GroupResult[];
  /** Flat numbers added on their own, e.g. the "3" in `roll 1d6 3`. */
  constants: number[];
  total: number;
};

export const MAX_DICE = 1000;
export const MAX_SIDES = 1_000_000;

export class DiceError extends Error {}

function parseGroup(notation: string, rawCount: string, rawSides: string, modifier: number): DiceGroup {
  const count = rawCount === "" ? 1 : Number(rawCount);
  const sides = Number(rawSides);

  if (count < 1) {
    throw new DiceError(`"${notation}" needs at least 1 die`);
  }
  if (sides < 1) {
    throw new DiceError(`"${notation}" needs at least 1 side`);
  }
  if (sides > MAX_SIDES) {
    throw new DiceError(`"${notation}" has more than ${MAX_SIDES} sides`);
  }

  return { notation, count, sides, modifier };
}

/**
 * Reads input as a sequence of terms. Terms may be separated by spaces, by `+`,
 * or by nothing at all, so `2d6 1d8`, `2d6 + 1d8` and `2d6+1d8` are equivalent.
 * A signed number directly after a dice group is a modifier on that group
 * (`1d20+5`); on its own it is a flat addition (`1d20 5`).
 */
export function parse(input: string): DiceTerm[] {
  // Each token is a dice group, a signed modifier, a plain number, a `+` joining
  // two groups, or whitespace. A sign followed by dice (`+ 2d10`) is a joiner,
  // not a modifier, so the lookahead keeps it out of the modifier branch. The
  // `\b` is what makes that lookahead trustworthy: without it `+12d10` would
  // backtrack to the shorter `+1` to satisfy the lookahead and leave `2d10`
  // behind, silently rolling 2 dice instead of 12.
  const lexer = /(\d*)d(\d+)|([+-])\s*(\d+)\b(?!\s*d)|(\d+)|\+|\s+/giy;
  const terms: DiceTerm[] = [];
  let lastGroup: DiceGroup | undefined;
  // MAX_DICE caps the whole roll, not each group: checking only per group would
  // let `1000d6 1000d6` through, and every further group would add more work.
  let totalDice = 0;

  lexer.lastIndex = 0;
  while (lexer.lastIndex < input.length) {
    const start = lexer.lastIndex;
    const token = lexer.exec(input);

    if (!token) {
      const rest = input.slice(start).trim().split(/\s+/)[0];
      throw new DiceError(`Could not read "${rest}" — try something like 1d6 or 2d10+3`);
    }

    const [, groupCount, groupSides, sign, signedValue, plainValue] = token;

    if (groupSides !== undefined) {
      lastGroup = parseGroup(token[0], groupCount, groupSides, 0);
      totalDice += lastGroup.count;
      if (totalDice > MAX_DICE) {
        throw new DiceError(`A roll is limited to ${MAX_DICE} dice`);
      }
      terms.push(lastGroup);
    } else if (signedValue !== undefined) {
      const value = sign === "-" ? -Number(signedValue) : Number(signedValue);
      // `1d6+2` modifies the preceding group; `1d6 2` is a flat addition.
      if (lastGroup && start > 0 && !/\s/.test(input[start - 1])) {
        lastGroup.modifier += value;
        lastGroup.notation += `${sign}${signedValue}`;
      } else {
        terms.push({ notation: token[0].trim(), constant: value });
        lastGroup = undefined;
      }
    } else if (plainValue !== undefined) {
      terms.push({ notation: plainValue, constant: Number(plainValue) });
      lastGroup = undefined;
    }
  }

  if (terms.length === 0) {
    throw new DiceError("Nothing to roll — try 1d6 or 2d10");
  }

  return terms;
}

export function roll(input: string): RollResult {
  const terms = parse(input);
  const groups: GroupResult[] = [];
  const constants: number[] = [];
  let total = 0;

  for (const term of terms) {
    if ("constant" in term) {
      constants.push(term.constant);
      total += term.constant;
      continue;
    }

    const rolls = Array.from({ length: term.count }, () => randomInt(1, term.sides + 1));
    const groupTotal = rolls.reduce((sum, value) => sum + value, 0) + term.modifier;
    groups.push({ notation: term.notation, rolls, modifier: term.modifier, total: groupTotal });
    total += groupTotal;
  }

  return { groups, constants, total };
}
