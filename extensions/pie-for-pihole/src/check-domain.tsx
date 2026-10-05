import { Action, ActionPanel, Color, Detail, Form, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPiholeAPI } from "./api/client";
import { isV6 } from "./utils";

function SearchResults({ domain, partial }: { domain: string; partial: boolean }) {
  const { isLoading, data: result } = useCachedPromise(
    (d: string, p: boolean) => getPiholeAPI().searchDomain(d, p),
    [domain, partial],
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Results for "${domain}"`} searchBarPlaceholder="Filter results">
      <List.Section title="User Domains">
        {result?.domains.map((entry, index) => (
          <List.Item
            key={`domain-${index}`}
            title={entry.domain}
            accessories={[
              {
                tag: {
                  value: entry.type,
                  color: entry.type === "allow" ? Color.Green : Color.Red,
                },
              },
              {
                tag: {
                  value: entry.kind,
                  color: Color.Blue,
                },
              },
              {
                tag: {
                  value: entry.enabled ? "enabled" : "disabled",
                  color: entry.enabled ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel title="Actions">
                <Action.CopyToClipboard title="Copy Domain" content={entry.domain} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Gravity Matches">
        {result?.gravity.map((entry, index) => (
          <List.Item
            key={`gravity-${index}`}
            title={entry.domain}
            subtitle={entry.address}
            actions={
              <ActionPanel title="Actions">
                <Action.CopyToClipboard title="Copy Domain" content={entry.domain} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function CheckDomain() {
  if (!isV6()) {
    return (
      <Detail
        markdown="## This command requires Pi-hole v6\n\nPlease update your Pi-hole version in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const { push } = useNavigation();

  function handleSubmit(values: { domain: string; partial: boolean }) {
    push(<SearchResults domain={values.domain} partial={values.partial} />);
  }

  return (
    <Form
      navigationTitle="Check Domain"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="domain" title="Domain" placeholder="example.com" />
      <Form.Checkbox id="partial" label="Partial Match" defaultValue={false} />
    </Form>
  );
}
