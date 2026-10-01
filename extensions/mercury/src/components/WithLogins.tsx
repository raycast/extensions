import { ReactNode } from "react";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadLogins, MercuryLogin } from "../logins";
import { NoAccountsView } from "./ErrorViews";

/** Loads the saved Mercury accounts, and asks for one when there are none. */
export function WithLogins({ children }: { children: (logins: MercuryLogin[], reload: () => void) => ReactNode }) {
  const { data: logins, isLoading, revalidate } = usePromise(loadLogins, [], { onError: () => {} });
  if (!logins || logins.length === 0) {
    return <List isLoading={isLoading}>{!isLoading && <NoAccountsView onAdded={revalidate} />}</List>;
  }
  return <>{children(logins, revalidate)}</>;
}
