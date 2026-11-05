import { Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { lookupChains } from "./lib/chains";
import { detect, type DetectedKind } from "./lib/detect";
import { withSettings } from "./with-settings";

function pathFor(kind: DetectedKind, value: string): { path: string; label: string } | null {
  switch (kind) {
    case "address":
      return { path: `address/${value}`, label: "Address" };
    case "txHash":
      return { path: `tx/${value}`, label: "Transaction" };
    case "number":
      return value.includes(".") ? null : { path: `block/${value}`, label: "Block" };
    default:
      return null;
  }
}

const readClipboard = () => Clipboard.readText();

function Command() {
  const [text, setText] = useState("");
  const { isLoading } = usePromise(readClipboard, [], {
    onData: (t) => {
      if (t) setText(t.trim());
    },
  });

  const det = detect(text);
  const target = pathFor(det.kind, det.value);

  return (
    <List
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Paste an address, tx hash, or block number"
      filtering={false}
      isLoading={isLoading}
    >
      {!target ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search a block explorer"
          description="Paste an address, transaction hash, or block number"
        />
      ) : (
        <List.Section title={`${target.label} on…`}>
          {lookupChains()
            .filter((chain) => chain.explorer)
            .map((chain) => {
              const url = `${chain.explorer}/${target.path}`;
              return (
                <List.Item
                  key={chain.id}
                  icon={Icon.Globe}
                  title={chain.name}
                  subtitle={chain.explorer.replace("https://", "")}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title={`Open on ${chain.name}`} url={url} />
                      <Action.CopyToClipboard title="Copy URL" content={url} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      )}
    </List>
  );
}

export default withSettings(Command);
