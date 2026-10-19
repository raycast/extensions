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
  if (count > MAX_DICE) {
    throw new DiceError(`"${notation}" rolls more than ${MAX_DICE} dice`);
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
  // not a modifier, so the lookahead keeps it out of the modifier branch.
  const lexer = /(\d*)d(\d+)|([+-])\s*(\d+)(?!\s*d\d)|(\d+)|\+|\s+/giy;
  const terms: DiceTerm[] = [];
  let lastGroup: DiceGroup | undefined;

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
