import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { apiFetch, handleApiError } from "../lib/api";
import { API_BASE } from "../lib/constants";
import { getExternalLink } from "../lib/external-link";
import { formatPrice } from "../lib/format";
import { imageMarkdown, itemImageUrl } from "../lib/image";
import { COPY_LINK, REFRESH, TOGGLE_PREVIEW } from "../lib/shortcuts";
import type { WishlistDetailResponse, WishlistItem } from "../lib/types";

type Props = {
  wishlistId: string;
  title: string;
  onUnauthorized: () => void;
};

export function WishlistDetail({ wishlistId, title, onUnauthorized }: Props) {
  const [showDetail, setShowDetail] = useState(true);
  const { pop } = useNavigation();

  // This view is pushed onto the nav stack, so swapping the root for the
  // invalid-key view alone would leave it stranded on top. Pop it first so a
  // 401 actually surfaces that screen.
  const handleUnauthorized = () => {
    pop();
    onUnauthorized();
  };

  const { data, isLoading, revalidate } = useCachedPromise(
    (id: string) => apiFetch<WishlistDetailResponse>(`/api/v1/wishlists/${id}`),
    [wishlistId],
    {
      keepPreviousData: true,
      onError: (error) => handleApiError(error, "Could not load items", handleUnauthorized),
    },
  );

  const items = data?.wishlist.items ?? [];
  const wishlistUrl = data ? `${API_BASE}/w/${data.wishlist.shareUrl}` : API_BASE;
  const hasItems = items.length > 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={title}
      searchBarPlaceholder="Search items"
      isShowingDetail={showDetail && hasItems}
    >
      {!isLoading && !hasItems ? (
        <List.EmptyView
          icon={Icon.Gift}
          title="No items yet"
          description="Add items via the Add to Wishlist command."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Wishlist in Browser" url={wishlistUrl} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={REFRESH} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            wishlistUrl={wishlistUrl}
            // hideReservations is the wishlist owner's privacy flag (default
            // true). When set, mirror the web app: owners never see reservation
            // counts or who reserved what. Treat undefined as true defensively.
            showReservations={!(data?.wishlist.hideReservations ?? true)}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((shown) => !shown)}
            onRefresh={revalidate}
          />
        ))
      )}
    </List>
  );
}

function ItemRow({
  item,
  wishlistUrl,
  showReservations,
  showDetail,
  onToggleDetail,
  onRefresh,
}: {
  item: WishlistItem;
  wishlistUrl: string;
  showReservations: boolean;
  showDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const image = itemImageUrl(item.image);
  const price = formatPrice(item.price, item.currency);
  const reserved = item.reservations.reduce((sum, reservation) => sum + reservation.quantity, 0);
  const someReserved = showReservations && reserved > 0;
  const productLink = item.link ? getExternalLink(item.link, item.id) : undefined;

  return (
    <List.Item
      icon={image}
      title={item.title}
      subtitle={showDetail ? undefined : (item.description ?? undefined)}
      accessories={showDetail ? undefined : buildAccessories(item, { price, reserved, showReservations })}
      // `keywords` are indexed by the search bar, so a "reserved" keyword would
      // let an owner filter down to exactly the reserved items even when the
      // reservation UI is hidden from them. Gate it on the same flag.
      keywords={[item.currency, item.priorityWish ? "priority" : "", someReserved ? "reserved" : ""].filter(Boolean)}
      detail={<List.Item.Detail markdown={buildItemMarkdown(item, image, { price, reserved, showReservations })} />}
      actions={
        <ActionPanel>
          {productLink && <Action.OpenInBrowser title="Open Product Link" url={productLink} />}
          <Action.OpenInBrowser title="Open Wishlist in Browser" url={wishlistUrl} />
          {productLink && (
            <Action.CopyToClipboard title="Copy Product Link" content={productLink} shortcut={COPY_LINK} />
          )}
          <Action.CopyToClipboard title="Copy Wishlist Link" content={wishlistUrl} />
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

type ItemMeta = {
  price: string | undefined;
  reserved: number;
  showReservations: boolean;
};

function buildAccessories(item: WishlistItem, { price, reserved, showReservations }: ItemMeta): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const someReserved = showReservations && reserved > 0;

  if (item.priorityWish) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Priority" });
  }
  if (someReserved && item.quantity > 1) {
    const remaining = Math.max(0, item.quantity - reserved);
    accessories.push({ text: `${remaining}/${item.quantity}`, tooltip: "Remaining / total" });
  } else if (item.quantity > 1) {
    accessories.push({ text: `×${item.quantity}`, tooltip: "Quantity" });
  } else if (someReserved) {
    accessories.push({ icon: Icon.CheckCircle, tooltip: "Reserved" });
  }
  if (price) accessories.push({ text: price });

  return accessories;
}

function buildItemMarkdown(item: WishlistItem, image: string, { price, reserved, showReservations }: ItemMeta): string {
  const parts = [`# ${item.title}`];
  if (item.description) parts.push("", item.description);

  const someReserved = showReservations && reserved > 0;
  const chips: string[] = [];
  if (price) chips.push(`**${price}**`);
  if (someReserved && item.quantity > 1)
    chips.push(`${Math.max(0, item.quantity - reserved)} of ${item.quantity} left`);
  else if (someReserved) chips.push("Reserved");
  else if (item.quantity > 1) chips.push(`Qty ${item.quantity}`);
  if (item.priorityWish) chips.push("★ Priority");
  if (chips.length > 0) parts.push("", chips.join(" · "));

  parts.push("", imageMarkdown(item.title, image));
  return parts.join("\n");
}
