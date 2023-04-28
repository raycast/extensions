import { getPreferenceValues, showToast, ToastStyle, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import { envatoErrors, envatoUser, saleItem } from "./types";
import Envato from "envato";
const token = getPreferenceValues().token;
import fs from "fs";

// DATE
const date = new Date();
const day = date.getDate();
const month = date.getMonth() + 1;
const year = date.getFullYear();
export const fullDate = `${day}, ${month}, ${year}`;

/*-----------------------------------*/
/*------ FETCH
/*-----------------------------------*/
export const useFetch = () => {
  const [state, setState] = useState<{
    showdetail: boolean;
    account: [];
    user: envatoUser;
    portfolio: [];
    sales: saleItem;
    badges: [];
    statement: [];
    errors: envatoErrors;
  }>({
    showdetail: false,
    account: [],
    user: [] as envatoUser,
    portfolio: [],
    sales: [] as saleItem,
    badges: [],
    statement: [],
    errors: [] as envatoErrors,
  });

  async function fetch() {
    try {
      // GET API
      const cache = fs.readFileSync(`${environment.supportPath}/cache.json`, "utf8");
      const client = Envato !== undefined ? new Envato.Client(token) : undefined;
      const username = client !== undefined ? await client.private.getUsername() : "";
      const userInfo = client !== undefined ? await client.user.getAccountDetails(username) : [];
      const accountInfo = client !== undefined ? await client.private.getAccountDetails() : [];
      const badges = client !== undefined ? await client.user.getBadges(username) : [];
      const portfolio = client !== undefined ? await client.catalog.searchItems({ username: username }) : [];
      const salesInfo = client !== undefined ? await client.private.getSales() : JSON.parse(cache);
      const statement = client !== undefined ? await client.private.getStatement({}) : [];
      const salesEmpty: any = salesInfo.length === 0 ? { empty: true } : [];

      // CACHE
      fs.writeFile(`${environment.supportPath}/cache.json`, JSON.stringify(salesInfo), (err) => {
        if (err) {
          console.error(err);
        }
        // file written successfully
        console.error(environment.supportPath);
      });
      setState((oldState) => ({
        ...oldState,
        sales: salesInfo as saleItem,
        statement: statement as [],
        user: userInfo as envatoUser,
        badges: badges as [],
        account: accountInfo as [],
        portfolio: portfolio as [],
        errors: salesEmpty as envatoErrors,
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
      }));
      showToast(ToastStyle.Failure, reason, description);
      return;
    }
  }

  useEffect(() => {
    fetch();
  }, []);

  return state;
};
