import { ActionPanel, Action, List, Icon, Color, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";

type Me = {
  email?: string;
  first_name?: string;
  last_name?: string;
  currency?: { main?: string };
  locale?: string;
  language?: string;
  timezone?: string;
  country?: string;
  start_day?: number;
  pro?: unknown;
  limits?: Record<string, boolean>;
};

export default function MyProfile() {
  const { data, isLoading, revalidate } = useCachedPromise(() => toshl.getMe());
  const me = data as Me | undefined;

  const name = [me?.first_name, me?.last_name].filter(Boolean).join(" ") || "—";
  const pro = me?.pro ? "Pro / paid" : "Free";

  return (
    <List isLoading={isLoading} navigationTitle="My Toshl">
      <List.Section title="Profile">
        <List.Item icon={Icon.Person} title="Name" subtitle={name} />
        <List.Item icon={Icon.Envelope} title="Email" subtitle={me?.email || "—"} />
        <List.Item icon={Icon.CreditCard} title="Subscription" subtitle={pro} />
      </List.Section>
      <List.Section title="Preferences">
        <List.Item icon={Icon.Coins} title="Main currency" subtitle={me?.currency?.main || "—"} />
        <List.Item icon={Icon.Globe} title="Locale" subtitle={me?.locale || "—"} />
        <List.Item icon={Icon.Clock} title="Timezone" subtitle={me?.timezone || "—"} />
        <List.Item icon={Icon.Flag} title="Country" subtitle={me?.country || "—"} />
        <List.Item
          icon={Icon.Calendar}
          title="Month starts on day"
          subtitle={me?.start_day != null ? String(me.start_day) : "—"}
        />
      </List.Section>
      <List.Section title="Feature limits (from API)">
        {me?.limits && Object.keys(me.limits).length > 0 ? (
          Object.entries(me.limits).map(([k, v]) => (
            <List.Item
              key={k}
              icon={{
                source: v ? Icon.CheckCircle : Icon.XMarkCircle,
                tintColor: v ? Color.Green : Color.SecondaryText,
              }}
              title={k.replace(/_/g, " ")}
              subtitle={v ? "Allowed" : "Not available"}
            />
          ))
        ) : (
          <List.Item icon={Icon.Info} title="Limits" subtitle={isLoading ? "…" : "Not in API response"} />
        )}
      </List.Section>
      <List.Section title="Actions">
        <List.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={() => revalidate()} />
              <Action title="Open Extension Preferences" onAction={() => openExtensionPreferences()} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
