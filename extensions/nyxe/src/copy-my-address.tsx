import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { nyxe, showApiError } from "./lib/raycast";

export default function CopyMyAddress() {
  const { data: me, isLoading } = useCachedPromise(() => nyxe().me(), [], {
    onError: (err) => showApiError(err, "Couldn't load your addresses"),
  });

  const row = (address: string, subtitle: string, icon: Icon) => (
    <List.Item
      key={address}
      title={address}
      subtitle={subtitle}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Address" content={address} />
          <Action.Paste title="Paste Address" content={address} />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter addresses…">
      {me?.addresses.primary ? (
        <List.Section title="Primary">{row(me.addresses.primary, "Your address", Icon.Person)}</List.Section>
      ) : null}
      {me && me.addresses.aliases.length > 0 ? (
        <List.Section title="Aliases">{me.addresses.aliases.map((a) => row(a, "Alias", Icon.AtSymbol))}</List.Section>
      ) : null}
      {me && me.addresses.sendAs.length > 0 ? (
        <List.Section title="Team">
          {me.addresses.sendAs.map((s) => row(s.address, s.name, Icon.TwoPeople))}
        </List.Section>
      ) : null}
    </List>
  );
}
