import { Action, ActionPanel, Color, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { UnauthorizedError, apiFetch } from "../lib/api";
import { getExternalLink } from "../lib/external-link";
import { formatPrice, itemImageUrl } from "../lib/image";
import { API_BASE, type WishlistDetailResponse, type WishlistItem } from "../lib/types";

type Props = {
  wishlistId: string;
  title: string;
  onUnauthorized: () => void;
};

export function WishlistDetail({ wishlistId, title, onUnauthorized }: Props) {
  const [showDetail, setShowDetail] = useState(true);
  const { pop } = useNavigation();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (id: string) => apiFetch<WishlistDetailResponse>(`/api/v1/wishlists/${id}`),
    [wishlistId],
    { keepPreviousData: true },
  );

  // This view is pushed onto the nav stack, so swapping the root to the
  // invalid-key view alone leaves it stranded on top — pop it first so a 401
  // actually surfaces that screen.
  const handleUnauthorized = useCallback(() => {
    pop();
    onUnauthorized();
  }, [pop, onUnauthorized]);

  useEffect(() => {
    if (!error) return;
    if (error instanceof UnauthorizedError) handleUnauthorized();
    else
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load items",
        message: error.message,
      });
  }, [error, handleUnauthorized]);

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
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            wishlistUrl={wishlistUrl}
            // hideReservations is the wishlist-owner-privacy flag (default true).
            // When true, mirror the web: owners never see reservation counts or
            // who reserved what. Treat undefined as true defensively.
            hideReservations={data?.wishlist.hideReservations ?? true}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((s) => !s)}
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
  hideReservations,
  showDetail,
  onToggleDetail,
  onRefresh,
}: {
  item: WishlistItem;
  wishlistUrl: string;
  hideReservations: boolean;
  showDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const image = itemImageUrl(item.image);
  const price = formatPrice(item.price, item.currency);
  const reserved = item.reservations.reduce((sum, r) => sum + r.quantity, 0);
  const remaining = Math.max(0, item.quantity - reserved);
  const showReservations = !hideReservations;
  const productLink = item.link ? getExternalLink(item.link, item.id) : undefined;

  const accessories: List.Item.Accessory[] = [];
  if (!showDetail) {
    if (item.priorityWish) {
      accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Priority" });
    }
    if (showReservations && reserved > 0 && item.quantity > 1) {
      accessories.push({ text: `${remaining}/${item.quantity}`, tooltip: "Remaining / total" });
    } else if (item.quantity > 1) {
      accessories.push({ text: `×${item.quantity}`, tooltip: "Quantity" });
    }
    if (showReservations && reserved > 0 && item.quantity === 1) {
      accessories.push({ icon: Icon.CheckCircle, tooltip: "Reserved" });
    }
    if (price) accessories.push({ text: price });
  }

  return (
    <List.Item
      icon={image}
      title={item.title}
      subtitle={showDetail ? undefined : (item.description ?? undefined)}
      accessories={accessories.length > 0 ? accessories : undefined}
      keywords={[item.currency, item.priorityWish ? "priority" : "", reserved > 0 ? "reserved" : ""].filter(Boolean)}
      detail={
        <List.Item.Detail markdown={buildItemMarkdown(item, image, { price, remaining, reserved, showReservations })} />
      }
      actions={
        <ActionPanel>
          {productLink && <Action.OpenInBrowser title="Open Product Link" url={productLink} />}
          <Action.OpenInBrowser title="Open Wishlist in Browser" url={wishlistUrl} icon={Icon.Globe} />
          {productLink && (
            <Action.CopyToClipboard
              title="Copy Product Link"
              content={productLink}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
          <Action.CopyToClipboard title="Copy Wishlist Link" content={wishlistUrl} />
          <Action
            title={showDetail ? "Hide Preview" : "Show Preview"}
            icon={Icon.AppWindowSidebarRight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function buildItemMarkdown(
  item: WishlistItem,
  image: string,
  meta: { price: string | undefined; remaining: number; reserved: number; showReservations: boolean },
): string {
  const parts: string[] = [`# ${item.title}`];
  if (item.description) parts.push("", item.description);

  const chips: string[] = [];
  if (meta.price) chips.push(`**${meta.price}**`);
  if (meta.showReservations && meta.reserved > 0 && item.quantity > 1) {
    chips.push(`${meta.remaining} of ${item.quantity} left`);
  } else if (meta.showReservations && meta.reserved > 0 && item.quantity === 1) {
    chips.push("Reserved");
  } else if (item.quantity > 1) {
    chips.push(`Qty ${item.quantity}`);
  }
  if (item.priorityWish) chips.push("★ Priority");
  if (chips.length > 0) parts.push("", chips.join(" · "));

  if (meta.showReservations && item.reservations.length > 0) {
    parts.push("", `_Reserved by ${item.reservations.map((r) => r.user.name).join(", ")}_`);
  }
  // Constrain height like the wishlist markdown does; pick the right query
  // separator since item images can be external URLs that already carry params.
  const sep = image.includes("?") ? "&" : "?";
  parts.push("", `![${item.title}](${image}${sep}raycast-height=200)`);
  return parts.join("\n");
}
