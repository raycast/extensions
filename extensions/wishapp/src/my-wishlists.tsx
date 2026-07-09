import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { InvalidApiKeyView } from "./components/invalid-api-key";
import { WishlistDetail } from "./components/wishlist-detail";
import { UnauthorizedError, apiFetch } from "./lib/api";
import { wishlistImageUrl } from "./lib/image";
import { API_BASE, type Wishlist, type WishlistsResponse } from "./lib/types";

export default function Command() {
  const [unauthorized, setUnauthorized] = useState(false);

  if (unauthorized) return <InvalidApiKeyView />;

  return <WishlistsList onUnauthorized={() => setUnauthorized(true)} />;
}

function WishlistsList({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [showDetail, setShowDetail] = useState(true);
  const { data, isLoading, error, revalidate } = useCachedPromise(
    () => apiFetch<WishlistsResponse>("/api/v1/wishlists"),
    [],
    { keepPreviousData: true },
  );

  useEffect(() => {
    if (!error) return;
    if (error instanceof UnauthorizedError) onUnauthorized();
    else
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load wishlists",
        message: error.message,
      });
  }, [error, onUnauthorized]);

  const owned = data?.ownedWishlists ?? [];
  const shared = data?.sharedWishlists ?? [];
  const empty = !isLoading && owned.length === 0 && shared.length === 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search wishlists"
      isShowingDetail={showDetail && !empty && (owned.length > 0 || shared.length > 0)}
    >
      {empty ? (
        <List.EmptyView
          icon={Icon.Gift}
          title="No wishlists yet"
          description="Create your first wishlist at getwish.app, then come back here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Website" url={API_BASE} />
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
        <>
          {owned.length > 0 && (
            <List.Section title="My Wishlists">
              {owned.map((w) => (
                <WishlistRow
                  key={w.id}
                  wishlist={w}
                  showDetail={showDetail}
                  onToggleDetail={() => setShowDetail((s) => !s)}
                  onRefresh={revalidate}
                  onUnauthorized={onUnauthorized}
                />
              ))}
            </List.Section>
          )}
          {shared.length > 0 && (
            <List.Section title="Shared with Me">
              {shared.map((w) => (
                <WishlistRow
                  key={w.id}
                  wishlist={w}
                  showDetail={showDetail}
                  onToggleDetail={() => setShowDetail((s) => !s)}
                  onRefresh={revalidate}
                  onUnauthorized={onUnauthorized}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
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
  const itemCount = `${wishlist._count.items} item${wishlist._count.items === 1 ? "" : "s"}`;

  return (
    <List.Item
      icon={imageUrl}
      title={wishlist.title}
      subtitle={showDetail ? undefined : (wishlist.description ?? undefined)}
      accessories={showDetail ? undefined : [{ text: itemCount }]}
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
          <Action.CopyToClipboard title="Copy Link" content={url} shortcut={{ modifiers: ["cmd"], key: "." }} />
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

function buildWishlistMarkdown(wishlist: Wishlist, imageUrl: string): string {
  const parts: string[] = [`# ${wishlist.title}`];
  if (wishlist.description) parts.push("", wishlist.description);

  const chips: string[] = [];
  const itemCount = wishlist._count.items;
  chips.push(`${itemCount} item${itemCount === 1 ? "" : "s"}`);
  if (wishlist._count.followers > 0) {
    chips.push(`${wishlist._count.followers} follower${wishlist._count.followers === 1 ? "" : "s"}`);
  }
  chips.push(wishlist.defaultCurrency);
  parts.push("", chips.join(" · "));

  parts.push("", `![${wishlist.title}](${imageUrl}?raycast-height=200)`);
  return parts.join("\n");
}
