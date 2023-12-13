import { MenuBarExtra, Icon, launchCommand, LaunchType, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface Preferences {
  webhookUrl: string;
  authToken: string;
}

type Data = {
  revenue: number;
};

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  const { data, isLoading } = useFetch<Data>(`${preferences.webhookUrl}`, {
    headers: {
      Authorization: `${preferences.authToken}`,
    },
  });

  if (!data) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const netRevenue = data ? data.revenue : 0;

  return (
    <MenuBarExtra icon={Icon.LineChart} title={`Net revenue: $${netRevenue.toString()}`}>
      <MenuBarExtra.Item
        title="Net Revenue"
        onAction={() => {
          launchCommand({ name: "search", type: LaunchType.UserInitiated });
        }}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
      />
    </MenuBarExtra>
  );
}
