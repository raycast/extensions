import { OWN_TRANSFER_MAX_GAP, OWN_TRANSFER_RATE_TOLERANCE, accountTypeTitles } from "../data/constants";
import { Account, AccountOrJar, AccountType, CurrencyRate, Jar, Transaction } from "../types";
import { isAccount } from "./accounts";
import { normalizeCategoryText } from "./mcc";
import { convertAmount } from "./rates";
import { MONEY_TRANSFER_MCC, findJarTitle, findPayoutJarTitle, isSavings } from "./savings";

/**
 * What a transaction of a card or FOP account is for the user's money as a whole. `savings` (card → own jar),
 * `withdrawal` (own jar → card) and `ownTransfer` (between own cards and FOP accounts, either side) only move the
 * user's money around, so they're neither spending nor income.
 */
export type FlowKind = "expense" | "income" | "savings" | "withdrawal" | "ownTransfer";

export interface Flow {
  kind: FlowKind;
  /** The id of the other side, when it's known: the jar, or the other account of an own transfer. */
  counterpartId?: string;
  /** What the description calls the other side when it isn't known, e.g. the title of a closed jar, or "White card". */
  label?: string;
}

/** The transactions of one account or jar, e.g. an `AccountStatementGroup`. */
export interface FlowGroup {
  account: AccountOrJar;
  transactions: Transaction[];
}

/** The key of a transaction in the result of `classifyFlows`. */
export function getFlowKey(accountId: string, transactionId: string) {
  return `${accountId}:${transactionId}`;
}

interface Entry {
  owner: AccountOrJar;
  transaction: Transaction;
  /** The user's account the transaction's `counterIban` names. */
  counterpart?: Account;
}

/** Amounts are in major units, so equal ones can differ by floating-point noise. */
function isSameAmount(a: number, b: number) {
  return Math.abs(a - b) < 0.005;
}

/**
 * Whether what `sent` took from one account is what `received` put on another. In one currency the amounts are
 * equal (a commission on the sender's side aside). Between currencies, either side may tell the other's amount as
 * its operation amount; else they must be close at today's rate.
 */
function isSameMoney(sent: Transaction, received: Transaction, rates: CurrencyRate[]) {
  const sentAmount = -sent.amount;
  const receivedAmount = received.amount;

  if (sent.currency.code === received.currency.code) {
    return isSameAmount(sentAmount, receivedAmount) || isSameAmount(sentAmount - sent.commission, receivedAmount);
  }

  if (
    sent.operationCurrency.code === received.currency.code &&
    isSameAmount(Math.abs(sent.operationAmount), receivedAmount)
  ) {
    return true;
  }
  if (
    received.operationCurrency.code === sent.currency.code &&
    isSameAmount(Math.abs(received.operationAmount), sentAmount)
  ) {
    return true;
  }

  const converted = convertAmount(rates, sentAmount, sent.currency.code, received.currency.code)?.result;
  return (
    converted !== undefined && Math.abs(converted - receivedAmount) <= receivedAmount * OWN_TRANSFER_RATE_TOLERANCE
  );
}

/**
 * Pairs outgoing entries with incoming ones at most `OWN_TRANSFER_MAX_GAP` apart that `canPair` accepts. Each
 * entry pairs once, the closest in time first.
 */
function pairEntries(outgoing: Entry[], incoming: Entry[], canPair: (out: Entry, into: Entry) => boolean) {
  const sorted = [...incoming].sort((a, b) => a.transaction.time - b.transaction.time);
  const candidates: { out: Entry; into: Entry; gap: number }[] = [];

  for (const out of outgoing) {
    const earliest = out.transaction.time - OWN_TRANSFER_MAX_GAP;
    // The first incoming entry inside the window.
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (sorted[middle].transaction.time < earliest) low = middle + 1;
      else high = middle;
    }

    for (let i = low; i < sorted.length; i++) {
      const into = sorted[i];
      const gap = Math.abs(into.transaction.time - out.transaction.time);
      if (into.transaction.time > out.transaction.time + OWN_TRANSFER_MAX_GAP) break;
      if (canPair(out, into)) candidates.push({ out, into, gap });
    }
  }

  const paired = new Set<Entry>();
  const pairs: [out: Entry, into: Entry][] = [];
  for (const { out, into } of candidates.sort((a, b) => a.gap - b.gap)) {
    if (paired.has(out) || paired.has(into)) continue;
    paired.add(out).add(into);
    pairs.push([out, into]);
  }
  return pairs;
}

// How monobank names the card the money came from in a transfer between the user's own cards, e.g. "З Білої
// картки". Only the wordings seen in real statements, and "З чорної картки" of the same form.
const cardWords: [word: RegExp, type: AccountType][] = [
  [/^чорної$/, AccountType.BLACK],
  [/^білої$/, AccountType.WHITE],
  [/^платинової$/, AccountType.PLATINUM],
];

// "З доларової картки" and "З єврової картки" name the card's currency, not its type.
const currencyWords: [word: RegExp, currencyCode: string][] = [
  [/^доларової$/, "USD"],
  [/^єврової$/, "EUR"],
];

/** The other side of an own transfer, as its description names it. */
type OwnSource = { type: AccountType } | { currencyCode: string };

/**
 * The user's own card an incoming transfer's description says the money came from. An outgoing transfer is always
 * "Переказ на картку", which says nothing about the receiver, and "З картки ПриватБанку" isn't own: the card may be
 * anyone's. A wording that isn't listed isn't guessed.
 */
function matchOwnSource(description: string): OwnSource | undefined {
  const text = normalizeCategoryText(description);
  if (text === "з дія.картки") return { type: AccountType.DIIA };

  const word = /^з (\S+) картки$/.exec(text)?.[1];
  if (!word) return undefined;

  const type = cardWords.find(([pattern]) => pattern.test(word))?.[1];
  if (type) return { type };
  const currencyCode = currencyWords.find(([pattern]) => pattern.test(word))?.[1];
  return currencyCode ? { currencyCode } : undefined;
}

/**
 * The user's only other card `source` can mean: of its type (the only one in the transfer's currency when there
 * are several), or in its currency.
 */
function findOwnSource(accounts: Account[], source: OwnSource, entry: Entry) {
  const others = accounts.filter((account) => account.id !== entry.owner.id);
  if ("currencyCode" in source) {
    const cards = others.filter(
      (account) => account.type !== AccountType.FOP && account.currency.code === source.currencyCode,
    );
    return cards.length === 1 ? cards[0] : undefined;
  }

  const candidates = others.filter((account) => account.type === source.type);
  if (candidates.length <= 1) return candidates[0];

  const { operationCurrency } = entry.transaction;
  const inCurrency = candidates.filter((account) => account.currency.code === operationCurrency.code);
  return inCurrency.length === 1 ? inCurrency[0] : undefined;
}

/** What to call the other side when it isn't one of `accounts`, e.g. "White card" or "USD card". */
function getOwnSourceLabel(source: OwnSource) {
  return `${"currencyCode" in source ? source.currencyCode : accountTypeTitles[source.type]} card`;
}

/**
 * What every transaction of the user's cards and FOP accounts is, by `getFlowKey`. `groups` are the statements of
 * all their cards, FOP accounts and jars for the same period, so both sides of a transfer are seen; jars only help
 * to recognise the other side and get no flows of their own.
 *
 * monobank has no "own transfer" flag, so the first rule that matches decides:
 *
 * 1. A top-up of an own jar by its title (the Savings category, see `isJarTopUp`).
 * 2. A transfer with the same money moving the other way in a jar's statement at the same time: a top-up of the
 *    jar, or a withdrawal from it.
 * 3. A counterparty IBAN (FOP accounts only) that is another account of the user.
 * 4. A transfer with the same money moving the other way on another account at the same time.
 * 5. Incoming money whose description names an own card ("З Білої картки") or an own jar: a payout ("Виплата банки
 *    «Title»", which only an own jar sends, so it counts for a jar that is gone too) or a known title. This is all
 *    there is when the other side's statement isn't stored for the period. An outgoing transfer never tells where
 *    it goes, so only rules 1–4 recognise it.
 * 6. Otherwise incoming money is income and outgoing money is an expense. That includes a transfer to the user's
 *    card in another bank, which looks like a transfer to anyone else.
 *
 * `rates` match transfers between currencies. `jarTitles` (from `getJarTitles`) add the closed and renamed jars to
 * rule 5; without them only the current jars count.
 */
export function classifyFlows(
  groups: FlowGroup[],
  options: { rates?: CurrencyRate[]; jarTitles?: readonly string[] } = {},
): Map<string, Flow> {
  const { rates = [] } = options;
  const accounts = groups.map((group) => group.account).filter(isAccount);
  const jars = groups.map((group) => group.account).filter((item): item is Jar => !isAccount(item));
  const jarByTitle = new Map(jars.map((jar) => [normalizeCategoryText(jar.title), jar]));
  const jarTitles = options.jarTitles ?? [...jarByTitle.keys()];
  const accountByIban = new Map(accounts.map((account) => [account.iban, account]));

  const accountEntries: Entry[] = [];
  const jarEntries: Entry[] = [];
  for (const { account, transactions } of groups) {
    const entries = isAccount(account) ? accountEntries : jarEntries;
    for (const transaction of transactions) entries.push({ owner: account, transaction });
  }

  const flows = new Map<string, Flow>();
  const getKey = (entry: Entry) => getFlowKey(entry.owner.id, entry.transaction.id);
  const isOpen = (entry: Entry) => !flows.has(getKey(entry));
  const isOutgoing = (entry: Entry) => entry.transaction.amount < 0;
  const isIncoming = (entry: Entry) => entry.transaction.amount > 0;
  const transfers = accountEntries.filter((entry) => entry.transaction.mcc === MONEY_TRANSFER_MCC);

  // 1 and 2. Top-ups that name a jar pair first, and only with a jar of that title, so their money in the jar's
  // statement can't be taken for another transfer of the same amount.
  const getJarTitle = (entry: Entry) => findJarTitle(entry.transaction.description, jarTitles);
  const isTopUpOf = (out: Entry, into: Entry) => isSameMoney(out.transaction, into.transaction, rates);
  const named = pairEntries(
    transfers.filter((entry) => isOutgoing(entry) && getJarTitle(entry) !== undefined),
    jarEntries.filter(isIncoming),
    (out, into) =>
      normalizeCategoryText(getJarTitle(out) ?? "") === normalizeCategoryText(into.owner.title) && isTopUpOf(out, into),
  );
  const toppedUp = new Set(named.map(([, into]) => into));
  const unnamed = pairEntries(
    transfers.filter((entry) => isOutgoing(entry) && getJarTitle(entry) === undefined),
    jarEntries.filter((entry) => isIncoming(entry) && !toppedUp.has(entry)),
    isTopUpOf,
  );
  for (const [out, into] of [...named, ...unnamed]) {
    flows.set(getKey(out), { kind: "savings", counterpartId: into.owner.id });
  }

  for (const entry of accountEntries) {
    if (!isOpen(entry) || !isSavings(entry.transaction)) continue;
    const title = findJarTitle(entry.transaction.description, jarTitles) ?? entry.transaction.description;
    const jar = jarByTitle.get(normalizeCategoryText(title));
    flows.set(getKey(entry), jar ? { kind: "savings", counterpartId: jar.id } : { kind: "savings", label: title });
  }

  const withdrawals = pairEntries(
    jarEntries.filter(isOutgoing),
    transfers.filter((entry) => isOpen(entry) && isIncoming(entry)),
    (out, into) => isSameMoney(out.transaction, into.transaction, rates),
  );
  for (const [out, into] of withdrawals) flows.set(getKey(into), { kind: "withdrawal", counterpartId: out.owner.id });

  // 3. The other side is still paired below, so it isn't counted as income or an expense.
  for (const entry of accountEntries) {
    const counterpart = entry.transaction.counterIban && accountByIban.get(entry.transaction.counterIban);
    if (!isOpen(entry) || !counterpart || counterpart.id === entry.owner.id) continue;
    entry.counterpart = counterpart;
    flows.set(getKey(entry), { kind: "ownTransfer", counterpartId: counterpart.id });
  }

  // 4.
  const candidates = accountEntries.filter(
    (entry) => entry.counterpart || (isOpen(entry) && entry.transaction.mcc === MONEY_TRANSFER_MCC),
  );
  const ownTransfers = pairEntries(candidates.filter(isOutgoing), candidates.filter(isIncoming), (out, into) => {
    if (out.owner.id === into.owner.id) return false;
    if (out.counterpart && out.counterpart.id !== into.owner.id) return false;
    if (into.counterpart && into.counterpart.id !== out.owner.id) return false;
    return isSameMoney(out.transaction, into.transaction, rates);
  });
  for (const [out, into] of ownTransfers) {
    flows.set(getKey(out), { kind: "ownTransfer", counterpartId: into.owner.id });
    flows.set(getKey(into), { kind: "ownTransfer", counterpartId: out.owner.id });
  }

  // 5.
  for (const entry of transfers) {
    if (!isOpen(entry) || !isIncoming(entry)) continue;
    const { description } = entry.transaction;

    const source = matchOwnSource(description);
    if (source) {
      const counterpart = findOwnSource(accounts, source, entry);
      flows.set(getKey(entry), {
        kind: "ownTransfer",
        ...(counterpart ? { counterpartId: counterpart.id } : { label: getOwnSourceLabel(source) }),
      });
      continue;
    }

    const jarTitle = findPayoutJarTitle(description) ?? findJarTitle(description, jarTitles);
    if (jarTitle !== undefined) {
      const jar = jarByTitle.get(normalizeCategoryText(jarTitle));
      flows.set(
        getKey(entry),
        jar ? { kind: "withdrawal", counterpartId: jar.id } : { kind: "withdrawal", label: jarTitle },
      );
    }
  }

  // 6.
  for (const entry of accountEntries) {
    if (isOpen(entry)) flows.set(getKey(entry), { kind: entry.transaction.amount >= 0 ? "income" : "expense" });
  }

  return flows;
}
