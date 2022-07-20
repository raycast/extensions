import { UseRecurly } from "./useRecurly";
import { useEffect, useState } from "react";
import { Account } from "recurly";
import showError from "../showError";

export type UseRecurlyAccounts = {
  account: Account | null;
  accountLoading: boolean;
};

// noinspection JSUnusedGlobalSymbols
export default function useRecurlyAccountByCode({ recurly, recurlyValid }: UseRecurly, code: string) {
  const [state, setState] = useState<UseRecurlyAccounts>({ accountLoading: false, account: null });

  useEffect(() => {
    if (code.length === 0) return;
    if (!recurlyValid) return;

    code.length > 0 &&
      Promise.resolve()
        .then(() => setState((prev) => ({ ...prev, accountLoading: true })))
        .then(() => recurly.getAccount(`code-${code}`))
        .then((account) => setState({ account, accountLoading: false }))
        .catch((e) => {
          if (e.type !== "not_found") {
            throw e;
          }

          setState({ account: null, accountLoading: false });
        })
        .catch(showError);
  }, [recurly, recurlyValid, code]);

  return state;
}
