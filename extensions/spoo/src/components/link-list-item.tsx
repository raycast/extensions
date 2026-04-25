import { Color, Icon, List } from "@raycast/api";
import {
  formatClicks,
  formatRelative,
  progressBar,
  toDate,
  truncate,
} from "@/lib/format";
import { getStatusMeta } from "@/lib/status";
import type { UrlListItem } from "@/schemas/url";

export interface LinkListItemProps {
  link: UrlListItem;
  actions: React.ReactNode;
  detail?: React.ReactNode;
  showAccessories?: boolean;
}

export function LinkListItem({
  link,
  actions,
  detail,
  showAccessories = true,
}: LinkListItemProps) {
  const accessories = showAccessories ? buildAccessories(link) : undefined;
  const alias = link.alias ?? link.id;
  const longUrl = link.long_url ?? "";
  return (
    <List.Item
      id={link.id}
      title={alias}
      subtitle={truncate(longUrl, 80)}
      icon={statusIcon(link)}
      accessories={accessories}
      detail={detail as List.Item.Props["detail"]}
      actions={actions}
      keywords={[alias, longUrl].filter(Boolean)}
    />
  );
}

function statusIcon(link: UrlListItem) {
  if (link.status && link.status !== "ACTIVE") {
    const meta = getStatusMeta(link.status);
    return { source: meta.icon, tintColor: meta.tintColor };
  }
  if (link.password_set) return { source: Icon.Lock, tintColor: Color.Yellow };
  return { source: Icon.Link, tintColor: Color.Blue };
}

function buildAccessories(link: UrlListItem): List.Item.Accessory[] {
  const totalClicks = link.total_clicks ?? 0;
  const accessories: List.Item.Accessory[] = [
    {
      text: formatClicks(totalClicks),
      icon: Icon.Eye,
      tooltip: `${totalClicks} total clicks`,
    },
  ];

  if (link.max_clicks) {
    accessories.push({
      text: progressBar(totalClicks, link.max_clicks, 6),
      tooltip: `${totalClicks} of ${link.max_clicks}`,
    });
  }

  const expireDate = toDate(link.expire_after);
  if (expireDate) {
    accessories.push({ date: expireDate, tooltip: "Expires" });
  }

  const createdDate = toDate(link.created_at);
  if (createdDate) {
    accessories.push({
      tag: { value: formatRelative(createdDate), color: Color.SecondaryText },
      tooltip: createdDate.toLocaleString(),
    });
  }

  return accessories;
}
