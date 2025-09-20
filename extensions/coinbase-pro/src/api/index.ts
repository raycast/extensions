import crypto from "crypto";
import fetch from "node-fetch";
import { preferences } from "@raycast/api";
import { ENDPOINTS, COINBASE_API_BASE_URL, COINBASE_EXCHANGE_API_BASE_URL } from "../enums";
import { formatAccounts } from "../utils";

const generateFetchOptions = (path: string, data?: object) => {
  const coinbaseAccessTimestamp = Date.now() / 1000; // in ms
  const coinbaseAccessPassphrase = preferences.coinbasePassphrase.value as string;
  const coinbaseSecret = preferences.coinbaseSecret.value as string;
  const requestPath = path;
  const method = data ? "POST" : "GET";
  const body = data ? JSON.stringify(data) : "";
  // create the prehash string by concatenating required parts
  const message = coinbaseAccessTimestamp + method + requestPath + body;
  // decode the base64 secret
  const key = Buffer.from(coinbaseSecret, "base64");
  // create a sha256 hmac with the secret
  const hmac = crypto.createHmac("sha256", key);
  // sign the require message with the hmac
  // and finally base64 encode the result
  const coinbaseAccessSign = hmac.update(message).digest("base64");

  return {
    method,
    headers: {
      Accept: "application/json",
      "cb-access-key": preferences.coinbaseApiKey.value as string,
      "cb-access-passphrase": coinbaseAccessPassphrase,
      "cb-access-sign": coinbaseAccessSign,
      "cb-access-timestamp": `${coinbaseAccessTimestamp}`,
    },
    body: body || undefined,
  };
};

export const getAccounts = async () => {
  const options = generateFetchOptions(ENDPOINTS.ACCOUNTS);
  const response = await fetch(COINBASE_EXCHANGE_API_BASE_URL + ENDPOINTS.ACCOUNTS, options);
  const json = (await response.json()) as any;

  if (json.message) throw json.message;

  return formatAccounts(json as Array<any>);
};

export const getPrice = async ({ baseCurrency, cryptoSymbol }: { baseCurrency: string; cryptoSymbol: string }) => {
  const response = await fetch(`${COINBASE_API_BASE_URL + ENDPOINTS.PRICES}/${cryptoSymbol}-${baseCurrency}/sell`);
  const { data } = (await response.json()) as any;

  return data;
};
