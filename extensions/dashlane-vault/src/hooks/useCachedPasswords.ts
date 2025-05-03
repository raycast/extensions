import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { CACHE_KEYS, cache } from "@/constants";
import { hideIfDefined } from "@/helper/cache";
import { getVaultCredentials } from "@/lib/dcli";
import { VaultCredential } from "@/types/dcli";

export function useCachedPasswords() {
  const { data, isLoading, revalidate } = usePromise(getVaultCredentials);
  const [passwords, setPasswords] = useState(getCachedPasswords());
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  useEffect(() => {
    if (data) {
      setPasswords(data);
      setCachedPasswords(data);
      setIsInitialLoaded(true);
    }
  }, [data]);

  return {
    passwords,
    isLoading,
    isInitialLoaded,
    revalidate,
  };
}

function getCachedPasswords(): VaultCredential[] | undefined {
  try {
    const cached = cache.get(CACHE_KEYS.PASSWORDS);
    return cached ? JSON.parse(cached) : undefined;
  } catch (_) {
    cache.remove(CACHE_KEYS.PASSWORDS);
  }
}

function setCachedPasswords(passwords: VaultCredential[]) {
  const cleaned = passwords.map((item) => ({
    ...item,
    email: hideIfDefined(item.email),
    login: hideIfDefined(item.login),
    password: hideIfDefined(item.password),
    secondaryLogin: hideIfDefined(item.secondaryLogin),
    otpSecret: hideIfDefined(item.otpSecret),
    note: hideIfDefined(item.note),
  }));
  cache.set(CACHE_KEYS.PASSWORDS, JSON.stringify(cleaned));
}
