import { Icon, MenuBarExtra, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/client";
import { handleApiError } from "./lib/errors";

export default function Command() {
  const { data, isLoading } = usePromise(
    async () => {
      const client = getClient();
      const [credits, usage] = await Promise.all([client.credits(), client.usage({ limit: 5 })]);
      return { credits, usage };
    },
    [],
    { onError: handleApiError },
  );

  const balance = data?.credits.credits;

  return (
    <MenuBarExtra
      icon={Icon.BarChart}
      isLoading={isLoading}
      title={balance !== undefined ? `${balance} credits` : undefined}
    >
      <MenuBarExtra.Section title="RankParse">
        <MenuBarExtra.Item
          title={balance !== undefined ? `${balance} credits remaining` : "Loading balance…"}
          icon={Icon.Coins}
        />
      </MenuBarExtra.Section>
      {data && data.usage.usage.length > 0 && (
        <MenuBarExtra.Section title="Recent Usage">
          {data.usage.usage.map((entry, i) => (
            <MenuBarExtra.Item
              key={`${entry.endpoint}-${entry.created_at}-${i}`}
              title={entry.domain ?? entry.url ?? entry.endpoint}
              subtitle={`${entry.endpoint} · ${entry.credits_used} credits`}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Top Up Credits"
          icon={Icon.Wallet}
          onAction={() => open("https://rankparse.com/dashboard")}
        />
        <MenuBarExtra.Item
          title="View Dashboard"
          icon={Icon.Globe}
          onAction={() => open("https://rankparse.com/dashboard")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
