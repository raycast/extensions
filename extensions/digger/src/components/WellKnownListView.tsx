import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { ResourceViewAction } from "../actions";
import { WellKnownData, WellKnownHit } from "../types";
import { WellKnownStatus } from "../utils/wellKnownCatalog";

interface WellKnownListViewProps {
  data: WellKnownData;
}

/** Registration status shown as a tag, so a deprecated file is not read as a current one. */
const REGISTRATION: Record<WellKnownStatus, { text: string; color: Color }> = {
  permanent: { text: "Permanent", color: Color.Green },
  provisional: { text: "Provisional", color: Color.Blue },
  deprecated: { text: "Deprecated", color: Color.Orange },
  obsoleted: { text: "Obsoleted", color: Color.Red },
  unregistered: { text: "Unregistered", color: Color.SecondaryText },
};

function formatSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined) return undefined;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

/** Short format name from the content type, e.g. `application/jrd+json` → JRD. */
function formatLabel(contentType: string): string {
  const type = contentType.split(";")[0].trim().toLowerCase();
  const subtype = type.split("/")[1] ?? type;
  const suffix = subtype.includes("+") ? subtype.split("+")[0] : subtype;
  return suffix.toUpperCase();
}

function hitAccessories(hit: WellKnownHit): List.Item.Accessory[] {
  const registration = REGISTRATION[hit.registration];
  const size = formatSize(hit.size);
  return [
    ...(size ? [{ text: size }] : []),
    { tag: { value: formatLabel(hit.contentType), color: Color.SecondaryText } },
    { tag: { value: registration.text, color: registration.color } },
  ];
}

export function WellKnownListView({ data }: WellKnownListViewProps) {
  const { hits, probed, unchecked, catchAll } = data;

  return (
    <List searchBarPlaceholder={`Search ${hits.length} well-known files`}>
      <List.Section title="Published" subtitle={`${hits.length} of ${probed} paths probed`}>
        {hits.map((hit) => (
          <List.Item
            key={hit.path}
            title={hit.path}
            icon={Icon.Document}
            subtitle={hit.contentType.split(";")[0]}
            accessories={hitAccessories(hit)}
            actions={
              <ActionPanel>
                <ResourceViewAction title="View Contents" url={hit.url} resourceName={hit.path} />
                <Action.OpenInBrowser url={hit.url} />
                <Action.CopyToClipboard title="Copy URL" content={hit.url} shortcut={Keyboard.Shortcut.Common.Copy} />
                {hit.reference && (
                  <Action.OpenInBrowser
                    title="Open Specification"
                    icon={Icon.Book}
                    url={hit.reference}
                    shortcut={Keyboard.Shortcut.Common.OpenWith}
                  />
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* A path that never got an answer is not a path the host declined to
          publish. Listing them separately keeps the count above honest. */}
      {unchecked && unchecked.length > 0 && (
        <List.Section title="Couldn't Check" subtitle={`${unchecked.length} paths`}>
          {unchecked.map((path) => (
            <List.Item
              key={path}
              title={path}
              icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
              subtitle="No response — not established either way"
            />
          ))}
        </List.Section>
      )}

      {/* Raycast also shows EmptyView when the SEARCH matches nothing, so this
          may only make a claim about the host when there is genuinely nothing
          to list. Otherwise it describes the filter. */}
      {hits.length === 0 && !unchecked?.length ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={catchAll ? "Nothing Could Be Established" : "No Well-Known Files Published"}
          description={
            catchAll
              ? "This host returns a file for every path under /.well-known/, including one nothing publishes, so no individual result means anything."
              : `Probed ${probed} paths from the IANA registry. This host publishes none of them.`
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matches"
          description="No well-known path matches your search."
        />
      )}
    </List>
  );
}
