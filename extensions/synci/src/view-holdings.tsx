import type { LaunchProps } from "@raycast/api";
import { HoldingsList } from "./components/holdings-list";
import { withSynci } from "./components/session";

function ViewHoldings(props: LaunchProps<{ launchContext: { accountId?: string } }>) {
  const accountId = props.launchContext?.accountId;
  return (
    <HoldingsList initialAccountId={typeof accountId === "string" && /^\d+$/.test(accountId) ? accountId : "all"} />
  );
}

export default withSynci(ViewHoldings);
