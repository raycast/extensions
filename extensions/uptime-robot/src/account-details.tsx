import { useLocalStorage } from "@raycast/utils";
import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import useUptimeRobot from "./lib/hooks/use-uptime-robot";
import { Account } from "./types";
import { useEffect } from "react";
import { hasDayPassed } from "./lib/utils/has-day-passed";

export default function AccountDetails() {
    const { isLoading: isUsingLocal, value: account, setValue: setAccountDetails } = useLocalStorage<Account & {updated_at: Date}>("account-details");
    const { isLoading: isFetching, revalidate } = useUptimeRobot<Account, "account">("getAccountDetails", {}, {
        async onData(data) {
            await setAccountDetails({
                ...data,
                updated_at: new Date()
            })
        },
        execute: !isUsingLocal && !account
    });

    useEffect(() => {
        account && hasDayPassed(account.updated_at) && revalidate();
    }, [account])

    const isLoading = isUsingLocal || isFetching;

    const markdown = !account ? "" : `
| Monitors |  |
|----------|--|
| Limit | ${account.monitor_limit} |
| Interval | ${account.monitor_interval} |
| up | ${account.up_monitors} |
| down | ${account.down_monitors} |
| paused | ${account.paused_monitors} |

| Payment Processor | Payment Period  |
|-------------------|-----------------|
| ${account.payment_processor || "N/A"} | ${account.payment_period || "N/A"} |
`;

    return <Detail isLoading={isLoading} markdown={markdown} metadata={account && <Detail.Metadata>
        <Detail.Metadata.Label title="Email" text={account.email} />
        <Detail.Metadata.Label title="User ID" text={account.user_id.toString()} />
        <Detail.Metadata.Label title="First Name" text={account.firstname} />
        <Detail.Metadata.Label title="SMS Credits" text={account.sms_credits.toString()} />
        <Detail.Metadata.Label title="Registered" text={new Date(account.registered_at).toDateString()} />
        <Detail.Metadata.Label title="Active Subscription" text={account.active_subscription || "N/A"} />
        <Detail.Metadata.Label title="Subscription Expiry Date" text={account.subscription_expiry_date ? new Date(account.subscription_expiry_date).toDateString() : "N/A"} />
    </Detail.Metadata>} actions={<ActionPanel>
        <Action icon={Icon.Redo} title="Refresh Acccount Details" onAction={revalidate} />
    </ActionPanel>} />
}