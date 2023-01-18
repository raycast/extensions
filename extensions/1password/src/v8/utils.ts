import { Cache, environment, Icon } from "@raycast/api";

import { execFileSync } from "child_process";
import { chmodSync, copyFileSync, existsSync } from "fs";
import { useEffect, useState } from "react";

import { CategoryName } from "./types";

export const cache = new Cache();

export const BINARY_PATH = `${environment.assetsPath}/op`;
export const CLI_PATH = `/usr/local/bin/op`;
export const CATEGORIES_CACHE_NAME = "@categories";
export const ITEMS_CACHE_NAME = "@items";
export const ACCOUNT_CACHE_NAME = "@account";

export function op(args: string[]) {
  if (!existsSync(CLI_PATH)) {
    chmodSync(BINARY_PATH, 0o755);
    copyFileSync(BINARY_PATH, CLI_PATH);
  }
  const stdout = execFileSync(CLI_PATH, args);
  return stdout.toString();
}

export function useOp<T>(args: string[], cacheKey?: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (cacheKey && cache.has(cacheKey)) {
      setIsLoading(false);
      return setData(JSON.parse(cache.get(cacheKey) as string));
    }

    try {
      const items = op([...args, "--format=json"]);

      if (cacheKey) {
        cache.set(cacheKey, items);
        return setData(JSON.parse(cache.get(cacheKey) as string));
      }
      return setData(JSON.parse(items));
    } catch (error: unknown) {
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey]);

  return { data, error, isLoading };
}

export function clearCache(key?: string) {
  if (!cache.isEmpty) {
    if (key && cache.has(key)) {
      cache.remove(key);
    } else {
      cache.clear({ notifySubscribers: false });
    }
  }
}

export function getCategoryIcon(category: CategoryName) {
  switch (category) {
    case "API_CREDENTIAL":
      return Icon.Code;
    case "CREDIT_CARD":
      return Icon.CreditCard;
    case "CRYPTO_WALLET":
      return Icon.Crypto;
    case "BANK_ACCOUNT":
    case "CUSTOM":
      return Icon.Wallet;
    case "DATABASE":
      return Icon.HardDrive;
    case "DOCUMENT":
      return Icon.Document;
    case "DRIVER_LICENSE":
      return Icon.Car;
    case "EMAIL_ACCOUNT":
      return Icon.Envelope;
    case "IDENTITY":
      return Icon.Person;
    case "LOGIN":
      return Icon.Fingerprint;
    case "MEDICAL_RECORD":
      return Icon.Heartbeat;
    case "MEMBERSHIP":
      return Icon.StarCircle;
    case "OUTDOOR_LICENSE":
      return Icon.Tree;
    case "PASSPORT":
      return Icon.Globe;
    case "PASSWORD":
      return Icon.Key;
    case "REWARD_PROGRAM":
      return Icon.Gift;
    case "SECURE_NOTE":
      return Icon.Lock;
    case "SOCIAL_SECURITY_NUMBER":
      return Icon.Shield;
    case "SOFTWARE_LICENSE":
      return Icon.CodeBlock;
    case "SERVER":
    case "SSH_KEY":
      return Icon.Terminal;
    case "WIRELESS_ROUTER":
      return Icon.Wifi;
    default:
      return Icon.Key;
  }
}
