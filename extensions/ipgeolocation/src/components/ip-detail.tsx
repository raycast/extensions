import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { IPData, Preferences } from "../types";
import { buildMarkdown } from "../utils/markdown";

const threatColor = (score: number): Color => {
  if (score <= 19) return Color.Green;
  if (score <= 44) return Color.Blue;
  if (score <= 79) return Color.Orange;
  return Color.Red;
};

function errorMarkdown(message: string): string {
  return `# Lookup Failed\n\n${message}\n\n**Common causes:**\n- Invalid IP address or domain\n- Invalid API key\n- Rate limit exceeded (free plan: 1,000 requests/day)\n- No internet connection`;
}

export function IPDetail({
  data,
  isLoading,
  error,
  onSearchAnother,
}: {
  data: IPData | null;
  isLoading: boolean;
  error?: string | null;
  onSearchAnother?: () => void;
}) {
  const { plan } = getPreferenceValues<Preferences>();
  const isPaid = plan === "paid";

  const markdown = error
    ? errorMarkdown(error)
    : data
      ? buildMarkdown(data, isPaid)
      : isLoading
        ? ""
        : "Enter an IP address or domain to get started.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data && !error && (
            <>
              <Action.CopyToClipboard title="Copy IP" content={data.ip} />
              <Action.CopyToClipboard
                title="Copy City & Country"
                content={`${data.location.city}, ${data.location.country_name}`}
              />
              {data.hostname && (
                <Action.CopyToClipboard
                  title="Copy Hostname"
                  content={data.hostname}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Coordinates"
                content={`${data.location.latitude}, ${data.location.longitude}`}
              />
              <Action.CopyToClipboard
                title="Copy ASN"
                content={data.asn.as_number}
              />
              <Action.OpenInBrowser
                // eslint-disable-next-line @raycast/prefer-title-case -- "ipgeolocation.io" is a lowercase brand name
                title="Open on ipgeolocation.io"
                url={`https://ipgeolocation.io/ip-location/${data.ip}`}
                icon={Icon.Globe}
              />
            </>
          )}
          {onSearchAnother && (
            <Action
              title={error ? "Try Again" : "Lookup Another"}
              icon={Icon.MagnifyingGlass}
              onAction={onSearchAnother}
            />
          )}
          <Action.OpenInBrowser
            title="Get API Key"
            url="https://ipgeolocation.io/signup"
            icon={Icon.Key}
          />
        </ActionPanel>
      }
      metadata={
        data && !error ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Country"
              text={data.location.country_name}
            />
            <Detail.Metadata.Label title="City" text={data.location.city} />
            {data.hostname ? (
              <Detail.Metadata.Label title="Hostname" text={data.hostname} />
            ) : null}
            <Detail.Metadata.Label
              title="AS number"
              text={data.asn.as_number}
            />
            <Detail.Metadata.Label
              title="AS organization"
              text={data.asn.organization}
            />
            {isPaid && data.company && (
              <>
                <Detail.Metadata.Label
                  title="Company"
                  text={data.company.name}
                />
                {data.company.type ? (
                  <Detail.Metadata.Label
                    title="Type"
                    text={data.company.type}
                  />
                ) : null}
              </>
            )}
            <Detail.Metadata.Label
              title="Timezone name"
              text={data.time_zone.name}
            />
            {isPaid && data.security ? (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Threat Score">
                  <Detail.Metadata.TagList.Item
                    text={`${data.security.threat_score}/100`}
                    color={threatColor(data.security.threat_score)}
                  />
                </Detail.Metadata.TagList>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title="VPN"
                  text={{
                    value: data.security.is_vpn ? "Yes" : "No",
                    color: data.security.is_vpn ? Color.Red : undefined,
                  }}
                />
                <Detail.Metadata.Label
                  title="Proxy"
                  text={{
                    value: data.security.is_proxy ? "Yes" : "No",
                    color: data.security.is_proxy ? Color.Red : undefined,
                  }}
                />
                <Detail.Metadata.Label
                  title="Tor"
                  text={{
                    value: data.security.is_tor ? "Yes" : "No",
                    color: data.security.is_tor ? Color.Red : undefined,
                  }}
                />
                <Detail.Metadata.Label
                  title="Bot"
                  text={{
                    value: data.security.is_bot ? "Yes" : "No",
                    color: data.security.is_bot ? Color.Red : undefined,
                  }}
                />
                <Detail.Metadata.Label
                  title="Known Attacker"
                  text={{
                    value: data.security.is_known_attacker ? "Yes" : "No",
                    color: data.security.is_known_attacker
                      ? Color.Red
                      : undefined,
                  }}
                />
                <Detail.Metadata.Label
                  title="Spam"
                  text={{
                    value: data.security.is_spam ? "Yes" : "No",
                    color: data.security.is_spam ? Color.Red : undefined,
                  }}
                />
                <Detail.Metadata.Separator />
              </>
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}
