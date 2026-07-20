import { getPreferenceValues, MenuBarExtra, Icon, open } from "@raycast/api";
import FathomRequest from "./utils/api";
import { LiveData } from "./types/LiveData";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  const { data, isLoading } = FathomRequest({
    endpoint: "/current_visitors",
  }) as {
    data: LiveData | undefined;
    isLoading: boolean;
    error: { title: string; message: string; markdown: string } | undefined;
  };

  if (!data) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const totalReferrers = data.referrers.reduce((sum, referrer) => sum + referrer.total, 0);

  return (
    <MenuBarExtra icon={Icon.BarChart} title={data.total.toLocaleString()} isLoading={isLoading}>
      <MenuBarExtra.Section title={"Visitors: " + data.total.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}>
        {data.content.map((page, index) => (
          <MenuBarExtra.Item
            key={index}
            title={page.total.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " " + page.pathname}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={`Referrers: ${totalReferrers.toLocaleString()}`}>
        {data.referrers.map((page, index) => (
          <MenuBarExtra.Item
            key={index}
            title={page.total.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " " + page.referrer_hostname}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open in Fathom"
          icon={Icon.Link}
          onAction={() => open(`https://app.usefathom.com?range=today&site=${preferences.siteId}`)}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
