import { Color, Icon, MenuBarExtra } from "@raycast/api";
import { useValidatePreferences, useWebsites } from "./lib/umami";
import { getFavicon } from "@raycast/utils";

export default function Main() {
  const { isLoading, error } = useValidatePreferences();

  if (isLoading || error)
    return (
      <MenuBarExtra icon="umami-menu-bar.png" isLoading={isLoading}>
        {error && (
          <MenuBarExtra.Item
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
            title="Error"
            subtitle={error.message}
          />
        )}
      </MenuBarExtra>
    );

  return <Websites />;
}

function Websites() {
  const { isLoading, data: websites = [] } = useWebsites();

  return (
    <MenuBarExtra isLoading={isLoading} icon="umami-menu-bar.png">
      <MenuBarExtra.Section>
        {websites.map((website) => (
          <MenuBarExtra.Item
            key={website.id}
            icon={getFavicon(`https://${website.domain}`, { fallback: Icon.Globe })}
            title={website.name}
            subtitle={`• ${website.stats.pageviews} pageviews • ${website.stats.visitors} visitors`}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
