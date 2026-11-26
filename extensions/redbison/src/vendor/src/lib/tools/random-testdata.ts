/**
 * Plausible-looking test data: names, addresses that go nowhere, numbers.
 *
 * Pulled out of the MCP handlers so the editors and the CLI can generate it
 * without asking a server for a random number, which is what they were doing.
 *
 * Randomness comes from the caller, so a test can pass a counter and assert
 * the shape of the output rather than its luck. In every real caller it is
 * node's crypto, the same source the server uses.
 *
 * The domains are the ones reserved for documentation and testing, so a leaked
 * address cannot reach a real mailbox: example.com, example.org and friends
 * are set aside by RFC 2606 and RFC 6761 for exactly this.
 */

/** Returns an integer in [0, bound). */
export type RandomInt = (bound: number) => number;

export const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Sam', 'Robin', 'Avery', 'Quinn',
  'Rowan', 'Sage', 'Elliot', 'Reese', 'Skyler', 'Jamie', 'Drew', 'Charlie', 'Emerson', 'Finley',
  'Aria', 'Noah', 'Priya', 'Kenji', 'Luca', 'Zara', 'Yusuf', 'Mei', 'Aiden', 'Ivy',
];

export const LAST_NAMES = [
  'Smith', 'Johnson', 'Lee', 'Patel', 'Garcia', 'Kim', 'Chen', 'Nguyen', 'Silva', 'Kowalski',
  'Andersen', 'Rossi', 'Dubois', 'Fischer', 'Novak', 'Okafor', 'Tanaka', 'Hassan', 'Mendez', 'Reyes',
  'Walker', 'Bennett', 'Foster', 'Hayes', 'Bishop', 'Palmer', 'Sinclair', 'Cortez', 'Yamamoto', 'Abbas',
];

export const EMAIL_DOMAINS = ['example.com', 'example.org', 'test.dev', 'sample.io', 'mail.test', 'demo.app'];

const LOCAL_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function randomNames(count: number, rand: RandomInt): string[] {
  return Array.from(
    { length: count },
    () => `${FIRST_NAMES[rand(FIRST_NAMES.length)]} ${LAST_NAMES[rand(LAST_NAMES.length)]}`,
  );
}

export function randomEmails(count: number, rand: RandomInt, domain?: string): string[] {
  return Array.from({ length: count }, () => {
    const localLen = 6 + rand(6);
    let local = '';
    for (let i = 0; i < localLen; i += 1) local += LOCAL_CHARS[rand(LOCAL_CHARS.length)];
    return `${local}@${domain ?? EMAIL_DOMAINS[rand(EMAIL_DOMAINS.length)]}`;
  });
}

export class RandomRangeError extends Error {}

/**
 * `count` numbers in the range.
 *
 * Integers include both ends, floats include the lower one, which is what the
 * schema has always said and worth restating because the two differ.
 */
export function randomNumbers(
  min: number,
  max: number,
  count: number,
  mode: 'integer' | 'float',
  rand: RandomInt,
  randFloat: () => number,
): number[] {
  const values: number[] = [];
  if (mode === 'integer') {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (hi < lo) throw new RandomRangeError('max must be >= min');
    for (let i = 0; i < count; i += 1) values.push(lo + rand(hi - lo + 1));
  } else {
    for (let i = 0; i < count; i += 1) values.push(min + randFloat() * (max - min));
  }
  return values;
}
