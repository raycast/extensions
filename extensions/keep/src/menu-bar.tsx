import { Icon, MenuBarExtra, open, getPreferenceValues } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { fetchUnreadSummary, getItemHost, normalizeBaseUrl } from "./api";

export default function UnreadLinks() {
  const { data, isLoading } = useCachedPromise(() => fetchUnreadSummary(5), []);

  const items = data?.items ?? [];
  const total = data?.total ?? data?.count ?? items.length;

  return (
    <MenuBarExtra
      icon={Icon.Bookmark}
      title={total > 0 ? String(total) : undefined}
      isLoading={isLoading}
    >
      {total === 0 ? <MenuBarExtra.Item title="No unread links" /> : null}

      {items.length ? (
        <MenuBarExtra.Section title={`${total} Unread`}>
          {items.map((item) => (
            <MenuBarExtra.Item
              key={item.id}
              icon={getFavicon(item.url, { size: 16, fallback: Icon.Link })}
              title={item.title || item.url}
              subtitle={getItemHost(item)}
              onAction={() => open(item.url)}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Keep"
          icon={Icon.Globe}
          onAction={() => open(normalizeBaseUrl(getPreferenceValues().baseUrl))}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
