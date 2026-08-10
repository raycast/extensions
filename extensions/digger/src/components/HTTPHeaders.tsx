import { List, Icon, Color, Action } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { DiggerResult } from "../types";
import { Actions } from "../actions";
import { truncateText } from "../utils/formatters";
import { AllHeadersListView } from "./AllHeadersListView";

interface HTTPHeadersProps {
  data: DiggerResult | null;
  onRefresh: () => void;
  progress: number;
}

const SECURITY_HEADERS = [
  { key: "content-security-policy", label: "CSP" },
  { key: "strict-transport-security", label: "HSTS" },
  { key: "x-frame-options", label: "X-Frame-Options" },
  { key: "x-content-type-options", label: "X-Content-Type-Options" },
  { key: "x-xss-protection", label: "X-XSS-Protection" },
  { key: "referrer-policy", label: "Referrer-Policy" },
  { key: "permissions-policy", label: "Permissions-Policy" },
];

const X402_HEADERS = [
  { key: "payment-required", label: "PAYMENT-REQUIRED" },
  { key: "payment-response", label: "PAYMENT-RESPONSE" },
];

export function HTTPHeaders({ data, onRefresh, progress }: HTTPHeadersProps) {
  if (!data) {
    return (
      <List.Item
        title="HTTP Headers"
        icon={progress < 1 ? getProgressIcon(progress, Color.Blue) : Icon.Link}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Fetching headers..." />
                <List.Item.Detail.Metadata.Label title="" text="Checking HTTP and security headers" />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    );
  }

  const { networking } = data;
  const headers = networking?.headers || {};

  return (
    <List.Item
      title="HTTP Headers"
      icon={Icon.Link}
      detail={<HTTPHeadersDetail headers={headers} />}
      actions={
        <Actions
          data={data}
          url={data.url}
          onRefresh={onRefresh}
          sectionActions={
            <Action.Push title="View All Headers" icon={Icon.List} target={<AllHeadersListView headers={headers} />} />
          }
        />
      }
    />
  );
}

interface HTTPHeadersDetailProps {
  headers: Record<string, string>;
}

function HTTPHeadersDetail({ headers }: HTTPHeadersDetailProps) {
  const getHeaderValue = (key: string): string | undefined => {
    return headers[key] ?? headers[key.toLowerCase()];
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="All Headers" />
          {Object.entries(headers).length > 0 ? (
            Object.entries(headers)
              .slice(0, 10)
              .map(([key, value]) => (
                <List.Item.Detail.Metadata.Label key={key} title={key} text={truncateText(value, 50)} />
              ))
          ) : (
            <List.Item.Detail.Metadata.Label title="" text="No headers available" />
          )}
          {Object.entries(headers).length > 10 && (
            <List.Item.Detail.Metadata.Label title="" text={`...and ${Object.entries(headers).length - 10} more`} />
          )}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Security Headers" />
          {SECURITY_HEADERS.map(({ key, label }) => {
            const value = getHeaderValue(key);
            return (
              <List.Item.Detail.Metadata.Label
                key={key}
                title={label}
                text={value ? truncateText(value, 40) : "Missing"}
                icon={
                  value ? { source: Icon.Check, tintColor: Color.Green } : { source: Icon.Xmark, tintColor: Color.Red }
                }
              />
            );
          })}

          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Payment Required" />
          {X402_HEADERS.map(({ key, label }) => {
            const value = getHeaderValue(key);
            return (
              <List.Item.Detail.Metadata.Label
                key={key}
                title={label}
                text={value ? truncateText(value, 40) : "Not present"}
                icon={
                  value
                    ? { source: Icon.CreditCard, tintColor: Color.Yellow }
                    : { source: Icon.Minus, tintColor: Color.SecondaryText }
                }
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
