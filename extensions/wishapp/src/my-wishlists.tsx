import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { InvalidApiKeyView } from "./components/invalid-api-key";
import { NoWishlistsView } from "./components/no-wishlists";
import { WishlistDetail } from "./components/wishlist-detail";
import { useWishlists } from "./lib/api";
import { API_BASE } from "./lib/constants";
import { imageMarkdown, wishlistImageUrl } from "./lib/image";
import { COPY_LINK, REFRESH, TOGGLE_PREVIEW } from "./lib/shortcuts";
import type { Wishlist } from "./lib/types";

export default function Command() {
  const [unauthorized, setUnauthorized] = useState(false);

  if (unauthorized) return <InvalidApiKeyView />;

  return <WishlistsList onUnauthorized={() => setUnauthorized(true)} />;
}

function WishlistsList({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [showDetail, setShowDetail] = useState(true);
  const { sections, wishlists: allWishlists, isLoading, revalidate } = useWishlists(onUnauthorized);
  const total = allWishlists.length;

  if (!isLoading && total === 0) return <NoWishlistsView onRefresh={revalidate} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search wishlists" isShowingDetail={showDetail && total > 0}>
      {sections
        .filter(([, wishlists]) => wishlists.length > 0)
        .map(([title, wishlists]) => (
          <List.Section key={title} title={title}>
            {wishlists.map((wishlist) => (
              <WishlistRow
                key={wishlist.id}
                wishlist={wishlist}
                showDetail={showDetail}
                onToggleDetail={() => setShowDetail((shown) => !shown)}
                onRefresh={revalidate}
                onUnauthorized={onUnauthorized}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function WishlistRow({
  wishlist,
  showDetail,
  onToggleDetail,
  onRefresh,
  onUnauthorized,
}: {
  wishlist: Wishlist;
  showDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
  onUnauthorized: () => void;
}) {
  const url = `${API_BASE}/w/${wishlist.shareUrl}`;
  const imageUrl = wishlistImageUrl(wishlist.image);

  return (
    <List.Item
      icon={imageUrl}
      title={wishlist.title}
      subtitle={showDetail ? undefined : (wishlist.description ?? undefined)}
      accessories={showDetail ? undefined : [{ text: pluralize(wishlist._count.items, "item") }]}
      keywords={[wishlist.defaultCurrency, wishlist.shareUrl]}
      detail={<List.Item.Detail markdown={buildWishlistMarkdown(wishlist, imageUrl)} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Wishlist"
            icon={Icon.Gift}
            target={<WishlistDetail wishlistId={wishlist.id} title={wishlist.title} onUnauthorized={onUnauthorized} />}
          />
          <Action.OpenInBrowser title="Open in Browser" url={url} />
          <Action.CopyToClipboard title="Copy Link" content={url} shortcut={COPY_LINK} />
          <Action
            title={showDetail ? "Hide Preview" : "Show Preview"}
            icon={Icon.AppWindowSidebarRight}
            shortcut={TOGGLE_PREVIEW}
            onAction={onToggleDetail}
          />
          <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={REFRESH} onAction={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function buildWishlistMarkdown(wishlist: Wishlist, imageUrl: string): string {
  const parts = [`# ${wishlist.title}`];
  if (wishlist.description) parts.push("", wishlist.description);

  const chips = [pluralize(wishlist._count.items, "item")];
  if (wishlist._count.followers > 0) chips.push(pluralize(wishlist._count.followers, "follower"));
  chips.push(wishlist.defaultCurrency);
  parts.push("", chips.join(" · "));

  parts.push("", imageMarkdown(wishlist.title, imageUrl));
  return parts.join("\n");
}
