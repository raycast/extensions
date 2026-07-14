import { Icon, MenuBarExtra, open } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { fetchLinks } from "./api";
import { Link } from "./types";

export default function UnreadLinks() {
  const { data, isLoading } = useCachedPromise(() => fetchLinks({ limit: 5, read: "unread", sort: "newest" }));

  const total = data?.total ?? 0;
  const links = data?.links ?? [];

  return (
    <MenuBarExtra icon={Icon.Bookmark} title={total > 0 ? String(total) : undefined} isLoading={isLoading}>
      {total === 0 ? (
        <MenuBarExtra.Item title="No unread links" />
      ) : (
        <MenuBarExtra.Section title={`${total} Unread`}>
          {links.map((link: Link) => (
            <MenuBarExtra.Item
              key={link.id}
              icon={getFavicon(link.url, { size: 16, fallback: Icon.Link })}
              title={link.title || link.url}
              subtitle={link.domain}
              onAction={() => open(link.url)}
            />
          ))}
          {total > 5 && (
            <MenuBarExtra.Item
              title={`+${total - 5} more`}
              icon={Icon.Ellipsis}
              onAction={() => open("https://www.shiori.sh")}
            />
          )}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Shiori" icon={Icon.Globe} onAction={() => open("https://www.shiori.sh")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
