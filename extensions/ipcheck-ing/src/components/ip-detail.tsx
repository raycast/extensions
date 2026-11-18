import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { IPCHECK_URL } from "../lib/constants";
import { countryCodeToFlagEmoji } from "../lib/geo";
import { fetchIPDetails, formatUTCOffset } from "../lib/ip-details";
import { MAP_ATTRIBUTION, staticMapURL } from "../lib/map";
import { IPDetails } from "../lib/types";
import { describeReservedIP, isIPv6, isValidIP } from "../lib/valid-ip";

export function IPDetailView({ ip, source }: { ip: string; source?: string }) {
  // Reserved addresses are answered locally: no external service can say anything useful
  // about them, so we never spend a request asking.
  const reserved = describeReservedIP(ip);
  const lookupAllowed = isValidIP(ip) && reserved === undefined;

  const { data, isLoading, error, revalidate } = useCachedPromise(fetchIPDetails, [ip], {
    execute: lookupAllowed,
    keepPreviousData: true,
    onError: (lookupError) => {
      void showFailureToast(lookupError, { title: "Could not look up this IP" });
    },
  });

  const details = lookupAllowed ? data : undefined;
  const family = isIPv6(ip) ? "IPv6" : "IPv4";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={ip}
      markdown={buildMarkdown({ ip, family, source, reserved, error, details })}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="IP Address" text={ip} icon={Icon.Globe} />
          <Detail.Metadata.Label title="Address Family" text={family} />
          {reserved ? (
            <Detail.Metadata.Label title="Scope" text={reserved} icon={{ source: Icon.Lock, tintColor: Color.Blue }} />
          ) : (
            <PublicMetadata details={details} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy IP" content={ip} />
          {details?.lat !== undefined && details.lon !== undefined && (
            <>
              <Action.OpenInBrowser
                title="Open in Google Maps"
                icon={Icon.Map}
                url={`https://www.google.com/maps/search/?api=1&query=${details.lat},${details.lon}`}
              />
              <Action.CopyToClipboard title="Copy Coordinates" content={`${details.lat}, ${details.lon}`} />
            </>
          )}
          {details && <Action.CopyToClipboard title="Copy All Details" content={JSON.stringify(details, null, 2)} />}
          {lookupAllowed && (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          )}
          <Action.OpenInBrowser title="Open IPCheck.ing" url={IPCHECK_URL} />
        </ActionPanel>
      }
    />
  );
}

function PublicMetadata({ details }: { details: IPDetails | undefined }) {
  if (!details) return null;

  const flag = details.countryCode ? countryCodeToFlagEmoji(details.countryCode) : "";
  const region = [details.regionName, details.region && `(${details.region})`].filter(Boolean).join(" ");
  const city = [details.city, details.district].filter(Boolean).join(", ");
  const coordinates =
    details.lat !== undefined && details.lon !== undefined ? `${details.lat}, ${details.lon}` : undefined;
  const offset = formatUTCOffset(details.offset);
  const timezone = [details.timezone, offset && `(${offset})`].filter(Boolean).join(" ");

  return (
    <>
      <Detail.Metadata.Separator />
      {details.country && <Detail.Metadata.Label title="Country" text={[details.country, flag].join(" ").trim()} />}
      {details.continent && <Detail.Metadata.Label title="Continent" text={details.continent} />}
      {region && <Detail.Metadata.Label title="Region" text={region} />}
      {city && <Detail.Metadata.Label title="City" text={city} />}
      {details.zip && <Detail.Metadata.Label title="Postal Code" text={details.zip} />}
      {coordinates && <Detail.Metadata.Label title="Coordinates" text={coordinates} icon={Icon.Pin} />}
      {timezone && <Detail.Metadata.Label title="Time Zone" text={timezone} icon={Icon.Clock} />}

      <Detail.Metadata.Separator />
      {details.isp && <Detail.Metadata.Label title="ISP" text={details.isp} />}
      {details.org && <Detail.Metadata.Label title="Organization" text={details.org} />}
      {details.as && <Detail.Metadata.Label title="AS" text={details.as} />}
      {details.asname && <Detail.Metadata.Label title="AS Name" text={details.asname} />}
      {details.reverse && <Detail.Metadata.Label title="Reverse DNS" text={details.reverse} />}

      <Detail.Metadata.Separator />
      <BooleanLabel title="Mobile Network" value={details.mobile} />
      <BooleanLabel title="Proxy or VPN" value={details.proxy} />
      <BooleanLabel title="Hosting Provider" value={details.hosting} />

      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="Data Source" target="https://ip-api.com" text="ip-api.com" />
    </>
  );
}

function BooleanLabel({ title, value }: { title: string; value: boolean | undefined }) {
  return (
    <Detail.Metadata.Label
      title={title}
      text={value ? "Yes" : "No"}
      icon={
        value
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.Circle, tintColor: Color.SecondaryText }
      }
    />
  );
}

function buildMarkdown({
  ip,
  family,
  source,
  reserved,
  error,
  details,
}: {
  ip: string;
  family: string;
  source?: string;
  reserved?: string;
  error?: Error;
  details?: IPDetails;
}): string {
  const lines = [`# ${ip}`];

  if (source) lines.push(`Reported by **${source}**.`);

  if (!isValidIP(ip)) {
    lines.push(`\`${ip}\` is not a valid IP address.`);
    return lines.join("\n\n");
  }

  if (reserved) {
    lines.push(
      `This is a reserved ${family} address — **${reserved}**.`,
      "Reserved addresses only mean something inside your own network, so no lookup was performed.",
    );
    return lines.join("\n\n");
  }

  if (error) {
    lines.push(`Could not look up this address: ${error.message}`);
    return lines.join("\n\n");
  }

  if (!details) {
    lines.push("Looking up this address…");
    return lines.join("\n\n");
  }

  const flag = details.countryCode ? countryCodeToFlagEmoji(details.countryCode) : "";
  const place = [details.city, details.regionName, details.country].filter(Boolean).join(", ");
  if (place) lines.push(`## ${[flag, place].filter(Boolean).join(" ")}`);

  const network = [details.isp && `**${details.isp}**`, details.asname && `AS ${details.asname}`]
    .filter(Boolean)
    .join(" · ");
  if (network) lines.push(network);

  // The map fills what is otherwise a lot of empty space under the heading.
  if (details.lat !== undefined && details.lon !== undefined) {
    lines.push(`![${place || ip}](${staticMapURL(details.lat, details.lon)})`, `_${MAP_ATTRIBUTION}._`);
  }

  return lines.join("\n\n");
}
