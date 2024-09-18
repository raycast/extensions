import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import api from "../api";
import { Account, UserInfoResponse, Jar } from "../types";
import { useLocalStorage } from "./useLocalStorage";

import { transformAccount, transformJar } from "../utils";

interface LocalStorageUserInfoData {
  clientInfo: {
    clientId: string;
    name: string;
    webHookUrl: string;
    permissions: string;
    accounts: Account[];
    jars: Jar[];
  };
  lastUpdated: number;
}

const lsInitialValue: LocalStorageUserInfoData = {
  clientInfo: {
    clientId: "",
    name: "",
    webHookUrl: "",
    permissions: "",
    accounts: [],
    jars: [],
  },
  lastUpdated: 0,
};

export function useClientInfo() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const {
    data,
    setData,
    isLoading: isLoadingFromLS,
  } = useLocalStorage<LocalStorageUserInfoData>("clientInfo", lsInitialValue);

  const { token } = getPreferenceValues<Preferences.Accounts>();

  useEffect(() => {
    if (isLoadingFromLS) return;

    const now = Date.now();
    if (now - data.lastUpdated <= 1000 * 60) return;

    fetchAccounts().then((clientInfo) => {
      if (!clientInfo) {
        setData({
          clientInfo: { ...data.clientInfo, accounts: data.clientInfo.accounts, jars: data.clientInfo.jars },
          lastUpdated: now,
        });
      } else {
        const jars = clientInfo.jars?.map(transformJar) ?? [];

        const accounts = clientInfo.accounts.map(transformAccount);
        const updatedAccounts = accounts.map((account) => {
          const savedAccount = data.clientInfo.accounts.find((savedAccount) => savedAccount.id === account.id);
          if (!savedAccount) return account;

          return {
            ...account,
            title: savedAccount.title,
          };
        });

        setData({
          clientInfo: { ...clientInfo, accounts: updatedAccounts, jars },
          lastUpdated: now,
        });
      }
    });
  }, [isLoadingFromLS]);

  async function fetchAccounts() {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await api.get<UserInfoResponse>("/personal/client-info", {
        headers: {
          "X-Token": token,
        },
      });

      return response.data;
    } catch (error) {
      console.error(error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function updateAccount(id: string, newData: Account) {
    const accounts = data.clientInfo.accounts.map((account) => {
      if (account.id !== id) return account;

      return {
        ...account,
        ...newData,
      };
    });

    setData((prev) => ({
      ...prev,
      clientInfo: {
        ...prev.clientInfo,
        accounts,
      },
    }));
  }

  return {
    data: data.clientInfo,
    setData,
    updateAccount,
    isLoading: isLoading || isLoadingFromLS,
    isError,
  };
}
