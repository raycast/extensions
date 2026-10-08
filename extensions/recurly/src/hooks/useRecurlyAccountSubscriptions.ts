import { useEffect, useState } from "react";
import { UseRecurly } from "./useRecurly";
import { Client, Subscription } from "recurly";
import showError from "../showError";

export type UseRecurlyAccountSubscriptions = {
  subscriptions: Subscription[];
  subscriptionsLoading: boolean;
};

export default function useRecurlyAccountSubscriptions({ recurly, recurlyValid }: UseRecurly, id: string) {
  const [state, setState] = useState<UseRecurlyAccountSubscriptions>({
    subscriptionsLoading: true,
    subscriptions: [],
  });

  useEffect(() => {
    if (!recurlyValid) return;

    Promise.resolve()
      .then(() => iterateAccountSubscriptions(recurly, id))
      .then((subscriptions) => setState({ subscriptions, subscriptionsLoading: false }))
      .catch(showError);
  }, [recurly, recurlyValid, id]);

  return state;
}

const iterateAccountSubscriptions = async (recurly: Client, id: string) => {
  const subscriptions: Subscription[] = [];

  const max = 40;
  let index = 0;

  for await (const subscription of recurly.listAccountSubscriptions(id).each()) {
    index++;
    if (index > max) {
      break;
    }

    subscriptions.push(subscription);
  }

  return subscriptions;
};
