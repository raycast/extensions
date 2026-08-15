import { Action, ActionPanel, Color, Detail, Icon, getPreferenceValues } from "@raycast/api";
import type { DomainDates } from "@/utils/whois-domain";

interface DomainDetailProps {
  domain: string;
  data: DomainDates | null | undefined;
  isLoading: boolean;
}

function buildMarkdown(domain: string, data: DomainDates | null | undefined): string {
  if (!data) return `# ${domain}\n\nFetching WHOIS data...`;

  if (data.isAvailable) {
    return [`# ${domain}`, "", "This domain is **available** for registration."].join("\n");
  }

  const lines: string[] = [`# ${domain}`, ""];

  if (data.isPrivate) {
    lines.push("Registrant information is protected by privacy.", "");
  }

  if (data.rawText) {
    lines.push("```text");
    lines.push(data.rawText);
    lines.push("```");
  } else {
    lines.push("Check the metadata panel on the right for full WHOIS details.");
  }

  return lines.join("\n");
}

export function DomainDetail({ domain, data, isLoading }: DomainDetailProps) {
  const prefs = getPreferenceValues<Preferences>();
  const markdown = buildMarkdown(domain, data);
  const isAvailable = data?.isAvailable === true;
  const isRegistered = !!data && !isAvailable;

  return (
    <Detail
      navigationTitle={`WHOIS: ${domain}`}
      markdown={markdown}
      isLoading={isLoading}
      metadata={
        isRegistered ? (
          <Detail.Metadata>
            {/* Dates */}
            <Detail.Metadata.Label title="Registered" text={data?.registrationDate ?? "—"} icon={Icon.Calendar} />
            <Detail.Metadata.Label title="Expires" text={data?.expirationDate ?? "—"} icon={Icon.Calendar} />
            {data?.lastUpdateDate && (
              <Detail.Metadata.Label title="Last Updated" text={data.lastUpdateDate} icon={Icon.Clock} />
            )}

            <Detail.Metadata.Separator />

            {/* Registrar */}
            {data?.registrar && <Detail.Metadata.Label title="Registrar" text={data.registrar} icon={Icon.Building} />}
            {data?.registrantName && (
              <Detail.Metadata.Label title="Registrant" text={data.registrantName} icon={Icon.Person} />
            )}

            <Detail.Metadata.Separator />

            {/* Status */}
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Registered" color={Color.Green} />
              {data?.isPrivate && <Detail.Metadata.TagList.Item text="Private" color={Color.Orange} />}
            </Detail.Metadata.TagList>

            {/* Nameservers */}
            {data?.nameservers && data.nameservers.length > 0 && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.TagList title="Nameservers">
                  {data.nameservers.map((ns) => (
                    <Detail.Metadata.TagList.Item key={ns} text={ns} />
                  ))}
                </Detail.Metadata.TagList>
              </>
            )}

            <Detail.Metadata.Separator />

            {/* Links */}
            <Detail.Metadata.Link title="More Info" target={`https://who.is/whois/${domain}`} text="View on who.is" />
            <Detail.Metadata.Link
              title="ICANN Lookup"
              target={`https://lookup.icann.org/lookup?name=${domain}`}
              text="View on ICANN"
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://who.is/whois/${domain}`} title="Open in Who.is" />
          <Action.OpenInBrowser url={`https://lookup.icann.org/lookup?name=${domain}`} title="Open in ICANN Lookup" />
          <Action.CopyToClipboard title="Copy Domain" content={domain} shortcut={{ modifiers: ["cmd"], key: "." }} />
          {data?.expirationDate && (
            <Action.CopyToClipboard
              title="Copy Expiration Date"
              content={data.expirationDate}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            />
          )}
          {data?.registrar && (
            <Action.CopyToClipboard
              title="Copy Registrar"
              content={data.registrar}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          )}
          {isAvailable && prefs.registrarName && prefs.registrarUrl && (
            <Action.OpenInBrowser
              url={prefs.registrarUrl.replace("{domain}", domain)}
              title={`Register on ${prefs.registrarName}`}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
