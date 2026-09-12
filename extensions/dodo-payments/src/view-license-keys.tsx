import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import React, { useCallback } from "react";
import { withAuth } from "./contexts/AuthContext";
import { withAuthGuard } from "./hooks/useAuthGuard";
import { useInfiniteLicenseKeys } from "./hooks/useQueries";
import type { LicenseKey } from "dodopayments/resources";
import { formatDateShort } from "./utils/formatting";

function getLicenseKeyStatusBadgeColor(licenseKey: LicenseKey): Color {
  switch (licenseKey.status) {
    case "active":
      // Check if activation limit is reached
      if (licenseKey.activations_limit && licenseKey.instances_count >= licenseKey.activations_limit) {
        return Color.Orange; // Orange for limit reached
      }
      return Color.Green; // Green for active
    case "expired":
      return Color.Red; // Red for expired
    case "disabled":
      return Color.SecondaryText; // Gray for disabled
    default:
      return Color.SecondaryText;
  }
}

function getLicenseKeyStatus(licenseKey: LicenseKey): string {
  if (licenseKey.status === "active") {
    // Check if activation limit is reached
    if (licenseKey.activations_limit && licenseKey.instances_count >= licenseKey.activations_limit) {
      return "Limit Reached";
    }
    return "Active";
  }

  return licenseKey.status.charAt(0).toUpperCase() + licenseKey.status.slice(1);
}

function LicenseKeysList() {
  const { data: licenseKeysData, isLoading, error, fetchNextPage, hasNextPage } = useInfiniteLicenseKeys({ limit: 20 });

  // Show toast notifications based on query state
  React.useEffect(() => {
    if (isLoading) {
      showToast({
        style: Toast.Style.Animated,
        title: "Loading license keys...",
      });
    } else if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load license keys",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else if (licenseKeysData) {
      const totalItems = licenseKeysData.pages.reduce((acc, page) => acc + page.items.length, 0);
      showToast({
        style: Toast.Style.Success,
        title: `Loaded ${totalItems} license keys`,
      });
    }
  }, [isLoading, error, licenseKeysData]);

  // Flatten all pages into a single array
  const licenseKeys: LicenseKey[] = React.useMemo(
    () => licenseKeysData?.pages.flatMap((page) => page.items) || [],
    [licenseKeysData?.pages],
  );

  const handleFetchNextPage = useCallback(() => fetchNextPage(), [fetchNextPage]);

  if (!isLoading && licenseKeys.length === 0) {
    return (
      <List searchBarPlaceholder="Search license keys...">
        <List.EmptyView
          icon={Icon.Key}
          title="No License Keys Found"
          description="No license keys are available for your account."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search license keys..."
      pagination={{
        hasMore: hasNextPage,
        pageSize: 20,
        onLoadMore: handleFetchNextPage,
      }}
      isShowingDetail
    >
      {licenseKeys.map((licenseKey) => (
        <List.Item
          key={licenseKey.id}
          icon={{
            source: Icon.Key,
            tintColor: getLicenseKeyStatusBadgeColor(licenseKey),
          }}
          title={licenseKey.key}
          accessories={[
            {
              text: `${licenseKey.instances_count}${licenseKey.activations_limit ? ` / ${licenseKey.activations_limit}` : ""}`,
              icon: Icon.Person,
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="License Key" text={licenseKey.key} />

                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={getLicenseKeyStatus(licenseKey)}
                      color={getLicenseKeyStatusBadgeColor(licenseKey)}
                    />
                  </List.Item.Detail.Metadata.TagList>

                  <List.Item.Detail.Metadata.Label
                    title="Activations"
                    text={`${licenseKey.instances_count} / ${licenseKey.activations_limit ?? "Unlimited"}`}
                  />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Product ID" text={licenseKey.product_id} />

                  <List.Item.Detail.Metadata.Label title="Customer ID" text={licenseKey.customer_id} />

                  <List.Item.Detail.Metadata.Label title="Payment ID" text={licenseKey.payment_id} />

                  {licenseKey.subscription_id && (
                    <List.Item.Detail.Metadata.Label title="Subscription ID" text={licenseKey.subscription_id} />
                  )}

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Expires"
                    text={licenseKey.expires_at ? formatDateShort(licenseKey.expires_at) : "Never"}
                  />

                  <List.Item.Detail.Metadata.Label title="Created" text={formatDateShort(licenseKey.created_at)} />

                  <List.Item.Detail.Metadata.Label title="License Key ID" text={licenseKey.id} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Dodo Payments"
                url={`https://app.dodopayments.com/sales/license-keys/${licenseKey.id}?backTo=/sales/license-keys`}
                icon={Icon.Globe}
              />

              <Action.CopyToClipboard title="Copy License Key" content={licenseKey.key} icon={Icon.Clipboard} />

              <Action.CopyToClipboard
                title="Copy License Key ID"
                content={licenseKey.id}
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
              />
              <Action.CopyToClipboard
                title="Copy Product ID"
                content={licenseKey.product_id}
                icon={Icon.Box}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Customer ID"
                content={licenseKey.customer_id}
                icon={Icon.Person}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// Export the component wrapped with authentication
export default withAuth(withAuthGuard(LicenseKeysList));
