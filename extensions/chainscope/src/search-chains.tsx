import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { listChains } from "./lib/chains";
import { openCommand } from "./lib/launch";
import { withSettings } from "./with-settings";

function Command() {
  const chains = useMemo(() => listChains(), []);

  return (
    <List searchBarPlaceholder="Search chains by name or chain id">
      <List.EmptyView
        icon={Icon.Link}
        title="Chain not found"
        description="Press Enter to add it as your own network."
        actions={
          <ActionPanel>
            <Action
              title="Add Network"
              icon={Icon.Plus}
              onAction={() => openCommand("manage-networks", "Manage Networks")}
            />
          </ActionPanel>
        }
      />
      <List.Section title={`Chains (${chains.length})`}>
        {chains.map((c) => {
          const symbol = c.chain.nativeCurrency.symbol;
          return (
            <List.Item
              key={c.id}
              icon={c.custom ? { source: Icon.Pencil, tintColor: Color.Purple } : Icon.Link}
              title={c.name}
              subtitle={`Chain ID ${c.id}`}
              keywords={[String(c.id), symbol, c.name]}
              accessories={[...(c.custom ? [{ tag: { value: "custom", color: Color.Purple } }] : []), { text: symbol }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Chain ID" content={String(c.id)} />
                  {c.defaultRpc ? (
                    <Action.CopyToClipboard title="Copy RPC URL" content={c.defaultRpc} concealed={c.custom} />
                  ) : null}
                  {c.explorer ? <Action.OpenInBrowser title="Open Explorer" url={c.explorer} /> : null}
                  {c.explorer ? <Action.CopyToClipboard title="Copy Explorer URL" content={c.explorer} /> : null}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default withSettings(Command);
