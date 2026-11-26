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

export class RandomRangeError extends Error {}

/**
 * The most each generator makes in one call: the limits the MCP tools have
 * always published in their schemas (names and emails 100, numbers 1,000),
 * so a local run accepts exactly what the server would. Without a check a
 * pasted count of a billion went straight into Array.from on the caller's
 * thread and ran the editor, the CLI or Raycast out of memory.
 */
export const MAX_COUNT = { names: 100, emails: 100, numbers: 1000 } as const;

function checkCount(count: number, max: number): number {
  if (!Number.isInteger(count) || count < 1 || count > max) {
    throw new RandomRangeError(`count must be a whole number from 1 to ${max.toLocaleString('en-US')}, not ${count}.`);
  }
  return count;
}

export function randomNames(count: number, rand: RandomInt): string[] {
  checkCount(count, MAX_COUNT.names);
  return Array.from(
    { length: count },
    () => `${FIRST_NAMES[rand(FIRST_NAMES.length)]} ${LAST_NAMES[rand(LAST_NAMES.length)]}`,
  );
}

export function randomEmails(count: number, rand: RandomInt, domain?: string): string[] {
  checkCount(count, MAX_COUNT.emails);
  return Array.from({ length: count }, () => {
    const localLen = 6 + rand(6);
    let local = '';
    for (let i = 0; i < localLen; i += 1) local += LOCAL_CHARS[rand(LOCAL_CHARS.length)];
    return `${local}@${domain ?? EMAIL_DOMAINS[rand(EMAIL_DOMAINS.length)]}`;
  });
}

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
  checkCount(count, MAX_COUNT.numbers);
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
