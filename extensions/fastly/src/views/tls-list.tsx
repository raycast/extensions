import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { TlsCertificate, TlsSubscription } from "../types";
import { getTlsCertificates, getTlsSubscriptions } from "../api";

const EXPIRY_WARNING_DAYS = 30;
const EXPIRY_CRITICAL_DAYS = 14;

function expiryAccessory(notAfter?: string | null): List.Item.Accessory {
  if (!notAfter) {
    return { tag: { value: "No Expiry Info", color: Color.SecondaryText } };
  }
  const expires = new Date(notAfter);
  const daysLeft = Math.floor((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (daysLeft < 0) {
    return { tag: { value: "Expired", color: Color.Red }, tooltip: `Expired ${expires.toLocaleDateString()}` };
  }
  if (daysLeft <= EXPIRY_CRITICAL_DAYS) {
    return {
      tag: { value: `Expires in ${daysLeft}d`, color: Color.Red },
      tooltip: `Expires ${expires.toLocaleString()}`,
    };
  }
  if (daysLeft <= EXPIRY_WARNING_DAYS) {
    return {
      tag: { value: `Expires in ${daysLeft}d`, color: Color.Orange },
      tooltip: `Expires ${expires.toLocaleString()}`,
    };
  }
  return {
    tag: { value: `Expires ${expires.toLocaleDateString()}`, color: Color.SecondaryText },
    tooltip: `${daysLeft} days left`,
  };
}

function subscriptionStateAccessory(state?: string): List.Item.Accessory {
  switch (state) {
    case "issued":
      return { tag: { value: "Issued", color: Color.Green } };
    case "pending":
    case "processing":
      return { tag: { value: state === "pending" ? "Pending" : "Processing", color: Color.Orange } };
    case "renewing":
      return { tag: { value: "Renewing", color: Color.Blue } };
    case "failed":
      return { tag: { value: "Failed", color: Color.Red } };
    default:
      return { tag: { value: state || "Unknown", color: Color.SecondaryText } };
  }
}

function subscriptionDomains(subscription: TlsSubscription): string[] {
  return (subscription.relationships?.tls_domains?.data || []).map((domain) => domain.id);
}

export function TlsList() {
  const [certificates, setCertificates] = useState<TlsCertificate[]>([]);
  const [subscriptions, setSubscriptions] = useState<TlsSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [certs, subs] = await Promise.all([
        getTlsCertificates(),
        getTlsSubscriptions().catch((error) => {
          console.error("Error loading TLS subscriptions:", error);
          return [] as TlsSubscription[];
        }),
      ]);
      certs.sort((a, b) => (a.attributes.not_after || "").localeCompare(b.attributes.not_after || ""));
      setCertificates(certs);
      setSubscriptions(subs);
    } catch (error) {
      console.error("Error loading TLS certificates:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load TLS certificates",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function commonActions() {
    return (
      <Action
        title="Refresh List"
        icon={Icon.ArrowClockwise}
        onAction={loadData}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search certificates and subscriptions by name or domain...">
      {certificates.length === 0 && subscriptions.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No TLS Certificates Found"
          description="Your account doesn't have any TLS certificates or subscriptions."
          icon={Icon.Lock}
        />
      ) : (
        <>
          <List.Section title="Managed Subscriptions" subtitle={String(subscriptions.length)}>
            {subscriptions.map((subscription) => {
              const domains = subscriptionDomains(subscription);
              return (
                <List.Item
                  key={subscription.id}
                  title={domains[0] || subscription.id}
                  subtitle={domains.slice(1).join(", ")}
                  keywords={domains}
                  icon={Icon.Lock}
                  accessories={[
                    { text: subscription.attributes.certificate_authority, tooltip: "Certificate authority" },
                    subscriptionStateAccessory(subscription.attributes.state),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard title="Copy Subscription ID" content={subscription.id} />
                      {commonActions()}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          <List.Section title="Certificates" subtitle={String(certificates.length)}>
            {certificates.map((certificate) => (
              <List.Item
                key={certificate.id}
                title={certificate.attributes.name || certificate.attributes.issued_to || certificate.id}
                subtitle={certificate.attributes.issuer}
                keywords={[certificate.attributes.issued_to || "", certificate.attributes.issuer || ""].filter(Boolean)}
                icon={Icon.Lock}
                accessories={[expiryAccessory(certificate.attributes.not_after)]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Certificate ID" content={certificate.id} />
                    {certificate.attributes.serial_number && (
                      <Action.CopyToClipboard
                        title="Copy Serial Number"
                        content={certificate.attributes.serial_number}
                      />
                    )}
                    {commonActions()}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
