import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  environment,
  Icon,
  List,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { resolveCredentials, revokeShare } from "./utils/api";
import type { ApiListResponse, Snippet, SnippetShare } from "./types";

interface Props {
  snippet: Snippet;
}

const TYPE_LABELS: Record<SnippetShare["type"], string> = {
  link: "Public Link",
  restricted: "Restricted",
  burner: "Burner",
};

const TYPE_COLORS: Record<SnippetShare["type"], Color> = {
  link: Color.Blue,
  restricted: Color.Purple,
  burner: Color.Orange,
};

export default function ManageShares({ snippet }: Props) {
  const { token, baseUrl, isMissingToken } = resolveCredentials();

  const { isLoading, data, revalidate } = useFetch<
    ApiListResponse<SnippetShare>
  >(`${baseUrl}/snippets/${snippet.id}/shares`, {
    execute: !isMissingToken,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const shares = data?.data ?? [];
  const activeShares = shares.filter((s) => !s.revoked_at && !s.is_burned_out);
  const inactiveShares = shares.filter((s) => s.revoked_at || s.is_burned_out);

  async function handleRevoke(share: SnippetShare) {
    const confirmed = await confirmAlert({
      title: "Revoke Share",
      message:
        "This share link will immediately stop working. This cannot be undone.",
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Revoking share…",
    });
    try {
      await revokeShare(snippet.id, share.id);
      toast.style = Toast.Style.Success;
      toast.title = "Share revoked";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to revoke share";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  }

  function renderShare(share: SnippetShare) {
    const isRevoked = !!share.revoked_at;
    const isBurned = share.is_burned_out;
    const isExpired = share.expires_at
      ? new Date(share.expires_at) < new Date()
      : false;
    const inactive = isRevoked || isBurned;

    const accessories: List.Item.Accessory[] = [];

    if (share.type === "burner") {
      const remaining = share.remaining_views;
      accessories.push({
        text:
          remaining !== null
            ? `${remaining} view${remaining !== 1 ? "s" : ""} left`
            : undefined,
        icon: {
          source: Icon.Eye,
          tintColor: isBurned ? Color.Red : Color.Orange,
        },
        tooltip: isBurned ? "Burned out" : `${share.view_count} views so far`,
      });
    } else {
      accessories.push({
        text: `${share.view_count} view${share.view_count !== 1 ? "s" : ""}`,
        icon: { source: Icon.Eye, tintColor: Color.SecondaryText },
      });
    }

    if (share.expires_at) {
      accessories.push({
        icon: {
          source: Icon.Clock,
          tintColor: isExpired ? Color.Red : Color.Yellow,
        },
        tooltip: isExpired
          ? "Expired"
          : `Expires ${new Date(share.expires_at).toLocaleString()}`,
      });
    }

    if (isRevoked) {
      accessories.push({ tag: { value: "Revoked", color: Color.Red } });
    } else if (isBurned) {
      accessories.push({ tag: { value: "Burned", color: Color.Orange } });
    }

    return (
      <List.Item
        key={share.id}
        title={TYPE_LABELS[share.type]}
        subtitle={
          share.share_url ??
          (share.type === "restricted" ? "Restricted access" : undefined)
        }
        accessories={accessories}
        icon={{
          source: Icon.Link,
          tintColor: inactive ? Color.SecondaryText : TYPE_COLORS[share.type],
        }}
        actions={
          <ActionPanel>
            {share.share_url && (
              <Action
                title="Copy Share URL"
                icon={Icon.Link}
                onAction={async () => {
                  await Clipboard.copy(share.share_url!);
                  await showHUD("Share URL copied");
                }}
              />
            )}
            {!inactive && (
              <Action
                title="Revoke Share"
                icon={Icon.XmarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleRevoke(share)}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Shares — ${snippet.title ?? "Untitled"}`}
    >
      {isMissingToken ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={
            environment.isDevelopment
              ? "Dev API Token required"
              : "API Token required"
          }
          description="Set your API token in extension preferences."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : shares.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Link}
          title="No shares"
          description="No shares have been created for this snippet yet."
        />
      ) : (
        <>
          {activeShares.length > 0 && (
            <List.Section title="Active">
              {activeShares.map(renderShare)}
            </List.Section>
          )}
          {inactiveShares.length > 0 && (
            <List.Section title="Inactive">
              {inactiveShares.map(renderShare)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
