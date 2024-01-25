import { getPreferenceValues, MenuBarExtra, Icon, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Page = {
  pathname: string;
  hostname: string;
  total: number;
};

type Referrer = {
  referrer_hostname: string;
  referrer_pathname: string;
  total: number;
};

type Data = {
  total: number;
  content: Page[];
  referrers: Referrer[];
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { data, isLoading } = useFetch<Data>(
    `https://api.usefathom.com/v1/current_visitors?site_id=${preferences.siteId}&detailed=true`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
      },
    },
  );

  if (!data) {
    return <MenuBarExtra isLoading={isLoading} />;
  }

  const totalReferrers = data.referrers.reduce((sum, referrer) => sum + referrer.total, 0);

  return (
    <MenuBarExtra icon={Icon.TwoPeople} title={data.total.toLocaleString()} isLoading={isLoading}>
      <MenuBarExtra.Section
        title={"Visitors (" + data.total.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ")"}
      >
        {data.content.map((page, index) => (
          <MenuBarExtra.Item
            key={index}
            title={page.total.toLocaleString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " " + page.pathname}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={`Referrers (${totalReferrers.toLocaleString()})`}>
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
          icon={Icon.BarChart}
          onAction={() => open(`https://app.usefathom.com?range=today&site=${preferences.siteId}`)}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
