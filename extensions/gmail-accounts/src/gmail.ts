import fetch from "node-fetch";
import { getCookies } from "chrome-cookie-decrypt";

async function getCookieStr() {
  const cookies = await getCookies(".google.com");
  const googleCookies = cookies.filter(
    (cookie) => cookie.domain === ".google.com" || cookie.domain === "accounts.google.com",
  );
  const cookieStr = googleCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  return cookieStr;
}

async function getAccountsReq() {
  const response = await fetch(
    "https://accounts.google.com/ListAccounts?listPages=0&authuser=0&pid=23&gpsia=1&source=ogb&atic=1&mo=1&mn=1&hl=en&ts=72",
    {
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "en",
        "content-type": "application/x-www-form-urlencoded;charset=utf-8",
        origin: "https://ogs.google.com",
        referer: "https://ogs.google.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        cookie: await getCookieStr(),
      },
    },
  );

  return response.json() as unknown as GetAccountsReqResult | [];
}

export async function getAccounts(): Promise<Account[]> {
  const result = await getAccountsReq();
  if (result.length === 0) {
    return [];
  }

  return parseAccounts(result);
}

function parseAccounts(input: GetAccountsReqResult): Account[] {
  return input[1].map((account) => ({
    id: account[7],
    fullname: account[2],
    email: account[3],
    avatar: account[4],
    isLoggedIn: account[9] === 1,
  }));
}

export type Account = {
  id: number;
  fullname: string;
  email: string;
  avatar: string;
  isLoggedIn: boolean;
};

type GetAccountsReqResult = [
  string,
  Array<
    [
      string,
      number,
      username: string,
      email: string,
      avatar: string,
      number,
      number,
      id: number,
      null,
      loggedIn: number,
      string,
      null,
      null,
      null,
      null,
    ]
  >,
];
