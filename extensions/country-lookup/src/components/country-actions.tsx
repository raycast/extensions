import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { commonName } from "../lib/format";
import type { Country } from "@yusifaliyevpro/countries";

export function CountryActions({
  country,
  onToggleDetail,
  onRefresh,
}: {
  country: Country;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      <Action title="Toggle Details" icon={Icon.Sidebar} onAction={onToggleDetail} />
      {country.links?.google_maps && (
        <Action.OpenInBrowser title="Open in Google Maps" icon={Icon.Map} url={country.links.google_maps} />
      )}
      {country.links?.wikipedia && (
        <Action.OpenInBrowser title="Open Wikipedia" icon={Icon.Book} url={country.links.wikipedia} />
      )}
      {country.links?.open_street_maps && (
        <Action.OpenInBrowser title="Open in Openstreetmap" icon={Icon.Pin} url={country.links.open_street_maps} />
      )}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Country Name"
          content={commonName(country)}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "." }, Windows: { modifiers: ["ctrl"], key: "." } }}
        />
        {country.codes?.alpha_2 && (
          <Action.CopyToClipboard
            title="Copy Country Code"
            content={country.codes.alpha_2}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "." },
              Windows: { modifiers: ["ctrl", "shift"], key: "." },
            }}
          />
        )}
        {country.flag?.emoji && <Action.CopyToClipboard title="Copy Flag Emoji" content={country.flag.emoji} />}
        <Action.CopyToClipboard
          title="Copy Raw JSON"
          icon={Icon.Code}
          content={JSON.stringify(country, null, 2)}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "j" },
            Windows: { modifiers: ["ctrl", "shift"], key: "j" },
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
