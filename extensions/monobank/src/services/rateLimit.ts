import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { STATEMENT_RATE_LIMIT, STORAGE_KEYS } from "../data/constants";
import { sleep } from "../utils/common";

/** One reserved statement request, shared by every command, the menu bar and the AI. */
interface Reservation {
  id: string;
  /** Unix milliseconds: when the request may be sent. In the future while it waits. */
  at: number;
  /** Unix milliseconds: when it was reserved. */
  reservedAt: number;
}

/** A reserved time to send one statement request. */
export interface StatementSlot {
  id: string;
  /** Unix milliseconds: when the request may be sent. */
  at: number;
}

/**
 * How far apart reservations are: the rate limit and a second more, so a request sent a little after its time (e.g.
 * a late timer) still comes a full minute after the previous one.
 */
const SPACING = STATEMENT_RATE_LIMIT + 1000;
/** How long a reservation waits before reading the list back, so a reservation written at the same time shows. */
const SETTLE_DELAY = 50;
/** Reservations that keep losing to others give up checking after this many tries. */
const MAX_ATTEMPTS = 10;

/**
 * The reservations that still matter: the ones waiting, and the latest ones sent less than a minute ago. Older
 * versions stored only the time of the last request, as a number. Reservations made "in the future" (e.g. before
 * the clock was set back) are left out.
 */
async function readReservations(now: number): Promise<Reservation[]> {
  const value = await LocalStorage.getItem<string | number>(STORAGE_KEYS.statementRequestedAt);
  let list: unknown = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value);
    } catch {
      list = undefined;
    }
  }
  if (typeof list === "number") list = [{ id: "legacy", at: list, reservedAt: list }];
  if (!Array.isArray(list)) return [];

  return list.filter(
    (item): item is Reservation =>
      typeof item === "object" &&
      item !== null &&
      typeof item.id === "string" &&
      typeof item.at === "number" &&
      typeof item.reservedAt === "number" &&
      item.reservedAt <= now &&
      item.at + SPACING > now,
  );
}

async function writeReservations(list: Reservation[]) {
  await LocalStorage.setItem(STORAGE_KEYS.statementRequestedAt, JSON.stringify(list));
}

// Reservations of this process run one at a time, so they never race each other.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Reserves the next time a statement request may be sent: a minute after the latest reservation, and not before
 * `notBefore` (unix ms). Wait until `at`, then send the request, or call `releaseStatementSlot` when it's no
 * longer needed.
 *
 * The reservation is added to the stored list, which is then read back. Another process (another command, the menu
 * bar or the AI) that wrote the list at the same time may have overwritten it; then it's missing, and this one
 * reserves again after the others. Whoever writes the list next has read it, so a reservation still in the list
 * is never shared.
 */
export function reserveStatementSlot(options: { notBefore?: number } = {}): Promise<StatementSlot> {
  const next = queue.then(() => reserve(options.notBefore ?? 0));
  queue = next.catch(() => undefined);
  return next;
}

async function reserve(notBefore: number): Promise<StatementSlot> {
  for (let attempt = 1; ; attempt++) {
    const now = Date.now();
    const list = await readReservations(now);
    const latest = Math.max(...list.map((item) => item.at + SPACING), 0);
    const slot = { id: randomUUID(), at: Math.max(now, notBefore, latest) };

    await writeReservations([...list, { ...slot, reservedAt: now }]);
    await sleep(SETTLE_DELAY);

    const check = await readReservations(Date.now());
    if (check.some((item) => item.id === slot.id) || attempt >= MAX_ATTEMPTS) return slot;
  }
}

/**
 * Gives back a slot whose request won't be sent, e.g. when the view that waited for it closed, so the next
 * reservation can take its time when nothing was reserved after it.
 */
export function releaseStatementSlot(slot: StatementSlot): Promise<void> {
  const next = queue.then(async () => {
    const list = await readReservations(Date.now());
    if (list.some((item) => item.id === slot.id)) {
      await writeReservations(list.filter((item) => item.id !== slot.id));
    }
  });
  queue = next.catch(() => undefined);
  return next;
}
