import fetch from "node-fetch";
import { getCookies, getProfiles, type Profile } from "chrome-cookie-decrypt";

async function getCookieStr(profile: string): Promise<string> {
  const cookies = await getCookies(".google.com", profile);
  const googleCookies = cookies.filter(
    (cookie) => cookie.domain === ".google.com" || cookie.domain === "accounts.google.com",
  );
  const cookieStr = googleCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  return cookieStr;
}

async function getAccountsReq(profile: string): Promise<GetAccountsReqResult | []> {
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
        cookie: await getCookieStr(profile),
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch accounts: ${response.statusText}`);
  }

  return response.json() as unknown as GetAccountsReqResult | [];
}

export async function getAccounts(): Promise<Account[]> {
  const profiles = await getProfiles();

  const getProfileAccounts = async (profile: Profile) => {
    const result = await getAccountsReq(profile.directory);
    if (result.length === 0) {
      return [];
    }
    const parsedAccounts = parseAccounts(result);
    return parsedAccounts.map((account) => ({ ...account, profile, key: `${account.email}-${profile.directory}` }));
  };

  const accounts = await Promise.all(profiles.map(getProfileAccounts));
  return accounts.flat();
}

function parseAccounts(input: GetAccountsReqResult): Omit<Account, "profile" | "key">[] {
  if (!Array.isArray(input[1])) {
    throw new Error("Invalid accounts array");
  }

  return input[1].map((account) => {
    const id = account[7];
    if (typeof id !== "number" && id !== null) {
      throw new Error("Invalid account id");
    }

    const fullname = account[2];
    if (typeof fullname !== "string") {
      throw new Error("Invalid account fullname");
    }

    const email = account[3];
    if (!email || typeof email !== "string") {
      throw new Error("Invalid account email");
    }

    const avatar = account[4];
    if (!avatar || typeof avatar !== "string") {
      throw new Error("Invalid account avatar");
    }

    if (typeof account[9] !== "number") {
      throw new Error("Invalid account isLoggedIn");
    }
    const isLoggedIn = account[9] === 1;

    return {
      id,
      fullname,
      email,
      avatar,
      isLoggedIn,
    };
  });
}

export type Account = {
  id: number;
  fullname: string;
  email: string;
  avatar: string;
  isLoggedIn: boolean;
  profile: Profile;
  key: string;
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
