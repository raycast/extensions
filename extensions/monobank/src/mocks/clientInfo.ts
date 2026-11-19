import { AccountResponse, ClientInfoResponse, JarResponse } from "../api/types";
import { BANK_REQUISITES } from "../data/constants";
import { createIban } from "./iban";
import { MOCK_OWNER } from "./owner";
import { MOCK_IDS, getMockBalance } from "./statement";

const UAH = 980;
const USD = 840;
const EUR = 978;

type AccountSpec = Omit<AccountResponse, "balance" | "iban"> & { accountNumber: string };

// One account of each type. Balances come from the statements, so the list and the statements agree.
const accounts: AccountSpec[] = [
  {
    id: MOCK_IDS.black,
    sendId: "MOCK0001",
    creditLimit: 5_000_000,
    type: "black",
    currencyCode: UAH,
    cashbackType: "UAH",
    maskedPan: ["537541******0001"],
    accountNumber: "26200000000001",
  },
  {
    id: MOCK_IDS.white,
    sendId: "MOCK0002",
    creditLimit: 0,
    type: "white",
    currencyCode: UAH,
    cashbackType: "UAH",
    maskedPan: ["444111******0002"],
    accountNumber: "26200000000002",
  },
  {
    id: MOCK_IDS.platinum,
    sendId: "MOCK0003",
    creditLimit: 0,
    type: "platinum",
    currencyCode: USD,
    cashbackType: "Miles",
    maskedPan: ["537541******0003"],
    accountNumber: "26200000000003",
  },
  {
    id: MOCK_IDS.iron,
    sendId: "MOCK0004",
    creditLimit: 0,
    type: "iron",
    currencyCode: EUR,
    cashbackType: "None",
    maskedPan: ["444111******0004"],
    accountNumber: "26200000000004",
  },
  {
    id: MOCK_IDS.fop,
    sendId: "",
    creditLimit: 0,
    type: "fop",
    currencyCode: UAH,
    cashbackType: "None",
    maskedPan: [],
    accountNumber: "26000000000005",
  },
  {
    id: MOCK_IDS.yellow,
    sendId: "MOCK0006",
    creditLimit: 0,
    type: "yellow",
    currencyCode: UAH,
    cashbackType: "UAH",
    maskedPan: ["537541******0006"],
    accountNumber: "26200000000006",
  },
  {
    id: MOCK_IDS.eAid,
    sendId: "",
    creditLimit: 0,
    type: "eAid",
    currencyCode: UAH,
    cashbackType: "None",
    maskedPan: ["444111******0007"],
    accountNumber: "26200000000007",
  },
];

type JarSpec = Omit<JarResponse, "balance">;

const jars: JarSpec[] = [
  {
    id: MOCK_IDS.jarVacation,
    sendId: "jar/MOCKJAR1",
    title: "На відпустку",
    description: "Карпати влітку",
    currencyCode: UAH,
    goal: 6_000_000,
  },
  {
    // Goal reached.
    id: MOCK_IDS.jarLaptop,
    sendId: "jar/MOCKJAR2",
    title: "Новий ноутбук",
    description: "",
    currencyCode: UAH,
    goal: 4_500_000,
  },
  {
    // No goal.
    id: MOCK_IDS.jarSafety,
    sendId: "jar/MOCKJAR3",
    title: "Подушка безпеки",
    description: "Не чіпати",
    currencyCode: UAH,
    goal: 0,
  },
  {
    id: MOCK_IDS.jarUsd,
    sendId: "jar/MOCKJAR4",
    title: "Долари",
    description: "",
    currencyCode: USD,
    goal: 200_000,
  },
];

/** `GET /personal/client-info` at `now` (unix ms). */
export function getMockClientInfo(now: number): ClientInfoResponse {
  return {
    clientId: "MOCKCLIENT",
    name: MOCK_OWNER.name,
    webHookUrl: "",
    permissions: "psfj",
    accounts: accounts.map(({ accountNumber, ...account }) => ({
      ...account,
      balance: getMockBalance(account.id, now) ?? 0,
      iban: createIban(BANK_REQUISITES.mfo, accountNumber),
    })),
    jars: jars.map((jar) => ({ ...jar, balance: getMockBalance(jar.id, now) ?? 0 })),
  };
}
