import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { commonName, formatCountryText } from "../lib/format";
import type { Country } from "@yusifaliyevpro/countries";

export function CountryActions({
  country,
  namesByCode,
  onToggleDetail,
  onRefresh,
}: {
  country: Country;
  namesByCode: Map<string, string>;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      <Action title="Toggle Details" icon={Icon.Sidebar} onAction={onToggleDetail} />
      {country.links?.google_maps && (
        <Action.OpenInBrowser title="Open in Google Maps" icon={Icon.Map} url={country.links.google_maps} />
      )}
      {country.links?.open_street_maps && (
        <Action.OpenInBrowser
          title="Open in OpenStreetMap"
          icon={Icon.Pin}
          url={country.links.open_street_maps}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
        />
      )}
      {country.links?.wikipedia && (
        <Action.OpenInBrowser
          title="Open Wikipedia"
          icon={Icon.Book}
          url={country.links.wikipedia}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "w" },
            Windows: { modifiers: ["ctrl", "shift"], key: "w" },
          }}
        />
      )}
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy as Text"
          icon={Icon.Clipboard}
          content={formatCountryText(country, namesByCode)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy Country Name"
          content={commonName(country)}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        {country.codes?.alpha_2 && (
          <Action.CopyToClipboard
            title="Copy Country Code"
            content={country.codes.alpha_2}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "k" },
              Windows: { modifiers: ["ctrl", "shift"], key: "k" },
            }}
          />
        )}
        {country.flag?.emoji && (
          <Action.CopyToClipboard
            title="Copy Flag Emoji"
            content={country.flag.emoji}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "e" },
              Windows: { modifiers: ["ctrl", "shift"], key: "e" },
            }}
          />
        )}
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
