import { getPreferenceValues, showToast, Toast, Cache } from "@raycast/api";
import { useState, useEffect } from "react";
import { envatoErrors } from "./types";
import Envato = require("envato");
const token = getPreferenceValues<Preferences>().token;
import { GetData } from "./types";
const cache = new Cache();

// DATE
const date = new Date();
const day = date.getDate();
const month = date.getMonth() + 1;
const year = date.getFullYear();
export const fullDate = `${day}, ${month}, ${year}`;

// ENVATO
export const envato = new Envato.Client(token);

/*-----------------------------------*/
/*------ FETCH
/*-----------------------------------*/
export const useFetch = () => {
  const [state, setState] = useState<GetData>({
    isLoading: true,
  });

  async function fetch() {
    try {
      // GET API
      const client = Envato !== undefined ? new Envato.Client(token) : undefined;
      const username = client !== undefined ? await client.private.getUsername() : "";
      const userInfo = client !== undefined ? await client.user.getAccountDetails(username) : undefined;
      const accountInfo = client !== undefined ? await client.private.getAccountDetails() : undefined;
      const badges = client !== undefined ? await client.user.getBadges(username) : [];
      const portfolio = client !== undefined ? await client.catalog.searchItems({ username: username }) : undefined;
      const email = client !== undefined ? await client.private.getEmail() : "";
      const salesInfo = client !== undefined ? await client.private.getSales() : [];
      const statement = client !== undefined ? await client.private.getStatement({}) : { count: 0, results: [] };
      const salesEmpty: any = salesInfo.length === 0 ? { empty: true } : [];

      setState((oldState) => ({
        ...oldState,
        sales: salesInfo,
        statement,
        user: userInfo,
        badges,
        account: accountInfo,
        portfolio,
        errors: salesEmpty as envatoErrors,
        isLoading: false,
      }));
    } catch (error: any) {
      // ERRORS
      let reason = "Error";
      let description = "An unknown error has occurred.";
      if (error.response !== undefined) {
        reason = error.response.reason ?? reason;
        description = error.response.error ?? description;
      }
      const out: { [key: string]: any } = { reason, description };
      setState((oldState) => ({
        ...oldState,
        errors: out as envatoErrors,
        isLoading: false,
      }));
      await showToast({
        style: Toast.Style.Failure,
        title: reason,
        message: description,
      });
      return;
    }
  }

  useEffect(() => {
    fetch();
  }, []);

  const cached = cache.get("state");
  if (state !== undefined && cached !== JSON.stringify(state)) {
    cache.set("state", JSON.stringify(state));
  }

  return state;
};

export async function verifyPurchaseCode(purchaseCode: string): Promise<Envato.ISaleResponse | undefined> {
  const client = new Envato.Client(token);
  return client.private.getSale(purchaseCode);
}
