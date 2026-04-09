import { List, ActionPanel, Action, Icon, Color, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchRealtime, fetchRealtimeMap } from "./lib/api";
import { RealtimeMapVisitor } from "./lib/types";
import { formatNumber } from "./lib/format";

function visitorLocation(v: RealtimeMapVisitor): string {
  const parts = [v.location?.city, v.location?.countryCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown Location";
}

function deviceIcon(type: string | undefined): Icon {
  switch (type?.toLowerCase()) {
    case "mobile":
      return Icon.Mobile;
    case "tablet":
      return Icon.Mobile;
    default:
      return Icon.Monitor;
  }
}

function conversionColor(score: number): Color {
  if (score >= 70) return Color.Green;
  if (score >= 30) return Color.Yellow;
  return Color.SecondaryText;
}

function VisitorDetailMetadata({ visitor }: { visitor: RealtimeMapVisitor }) {
  const loc = visitor.location;
  const sys = visitor.system;
  const score = visitor.conversionLikelihood?.score;
  const params = visitor.params;

  const locationStr =
    [loc?.city, loc?.region, loc?.countryCode].filter(Boolean).join(", ") ||
    "Unknown";

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Location"
            text={locationStr}
            icon={Icon.Pin}
          />
          <List.Item.Detail.Metadata.Label
            title="Device"
            text={sys?.device?.type || "Unknown"}
            icon={deviceIcon(sys?.device?.type)}
          />
          <List.Item.Detail.Metadata.Label
            title="Browser"
            text={sys?.browser?.name || "Unknown"}
            icon={Icon.Globe}
          />
          <List.Item.Detail.Metadata.Label
            title="OS"
            text={sys?.os?.name || "Unknown"}
            icon={Icon.ComputerChip}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Current Page"
            text={visitor.currentUrl || "/"}
          />
          <List.Item.Detail.Metadata.Label
            title="Referrer"
            text={visitor.referrer || "Direct"}
          />
          <List.Item.Detail.Metadata.Label
            title="Visits"
            text={String(visitor.visitCount ?? 1)}
          />
          {params?.utm_source && (
            <List.Item.Detail.Metadata.Label
              title="UTM Source"
              text={params.utm_source}
            />
          )}
          {params?.utm_campaign && (
            <List.Item.Detail.Metadata.Label
              title="UTM Campaign"
              text={params.utm_campaign}
            />
          )}
          {params?.ref && (
            <List.Item.Detail.Metadata.Label title="Ref" text={params.ref} />
          )}
          <List.Item.Detail.Metadata.Separator />
          {score != null && (
            <List.Item.Detail.Metadata.TagList title="Conversion Likelihood">
              <List.Item.Detail.Metadata.TagList.Item
                text={`${score}%`}
                color={conversionColor(score)}
              />
            </List.Item.Detail.Metadata.TagList>
          )}
          {visitor.isCustomer && (
            <List.Item.Detail.Metadata.Label
              title="Customer"
              text={visitor.customerName || "Yes"}
              icon={Icon.Star}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function RealtimeVisitors() {
  const { data: realtime, isLoading: loadingCount } = useCachedPromise(
    fetchRealtime,
    [],
    { failureToastOptions: { title: "Failed to load realtime count" } },
  );
  const { data: mapData, isLoading: loadingMap } = useCachedPromise(
    fetchRealtimeMap,
    [],
    { failureToastOptions: { title: "Failed to load visitor data" } },
  );

  const visitors = mapData?.visitors || [];
  const count = realtime?.visitors ?? visitors.length;

  return (
    <List
      isLoading={loadingCount || loadingMap}
      isShowingDetail
      navigationTitle={`${formatNumber(count)} Online`}
      searchBarPlaceholder="Search visitors by location, page, device..."
    >
      <List.Section title={`${formatNumber(count)} Active Visitors`}>
        {visitors.map((v, i) => {
          const score = v.conversionLikelihood?.score;

          return (
            <List.Item
              key={v.visitorId || i}
              title={visitorLocation(v)}
              icon={deviceIcon(v.system?.device?.type)}
              keywords={[
                v.location?.city,
                v.location?.countryCode,
                v.system?.browser?.name,
                v.system?.os?.name,
                v.system?.device?.type,
                v.currentUrl,
              ].filter((k): k is string => !!k)}
              accessories={[
                ...(score != null
                  ? [
                      {
                        tag: {
                          value: `${score}% of conversion`,
                          color: conversionColor(score),
                        },
                      },
                    ]
                  : []),
              ]}
              detail={<VisitorDetailMetadata visitor={v} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Page URL"
                    icon={Icon.Clipboard}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                    content={v.currentUrl || ""}
                  />
                  <Action.OpenInBrowser
                    title="Open Datafast Dashboard"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    url="https://datafa.st"
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {mapData?.recentEvents && mapData.recentEvents.length > 0 && (
        <List.Section title="Recent Events">
          {mapData.recentEvents.map((e) => (
            <List.Item
              key={e._id}
              title={
                e.type === "pageview" ? `Pageview: ${e.path || "/"}` : e.type
              }
              icon={e.type === "pageview" ? Icon.Globe : Icon.Star}
              accessories={[
                ...(e.countryCode ? [{ text: e.countryCode }] : []),
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Type"
                        text={e.type}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Path"
                        text={e.path || "/"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Time"
                        text={new Date(e.timestamp).toLocaleTimeString()}
                      />
                      {e.countryCode && (
                        <List.Item.Detail.Metadata.Label
                          title="Country"
                          text={e.countryCode}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Path"
                    icon={Icon.Clipboard}
                    content={e.path || "/"}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {mapData?.recentPayments && mapData.recentPayments.length > 0 && (
        <List.Section title="Recent Payments">
          {mapData.recentPayments.map((p, i) => (
            <List.Item
              key={`payment-${i}`}
              title={`${p.currency || "$"}${p.amount ?? 0}`}
              icon={Icon.BankNote}
              accessories={[
                ...(p.customerName ? [{ text: p.customerName }] : []),
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Amount"
                        text={`${p.currency || "$"}${p.amount ?? 0}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Time"
                        text={new Date(p.timestamp).toLocaleTimeString()}
                      />
                      {p.customerName && (
                        <List.Item.Detail.Metadata.Label
                          title="Customer"
                          text={p.customerName}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Amount"
                    icon={Icon.Clipboard}
                    content={`${p.currency || "$"}${p.amount ?? 0}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
