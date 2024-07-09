import { useLocalStorage } from "@raycast/utils";
import { Detail } from "@raycast/api";
import useUptimeRobot from "./lib/hooks/use-uptime-robot";

type Account = {
    email: string;
    user_id: number;
    firstname: string;
    sms_credits: number;
    payment_processor: string | null;
    payment_period: string | null;
    subscription_expiry_date: string | null;
    monitor_limit: number;
    monitor_interval: number;
    up_monitors: number;
    down_monitors: number;
    paused_monitors: number;
    total_monitors_count: number;
    registered_at: string;
    active_subscription: string | null;
    organizations: unknown[];
}

export default function AccountDetails() {
    const { isLoading: isUsingLocal, value: account, setValue: setAccountDetails } = useLocalStorage<Account & {updated_at: Date}>("account-details");
    const { isLoading: isFetching } = useUptimeRobot<Account, "account">("getAccountDetails", {}, {
        async onData(data) {
            await setAccountDetails({
                ...data,
                updated_at: new Date()
            })
        },
        execute: !isUsingLocal && !account
    });

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
    </Detail.Metadata>} />
}