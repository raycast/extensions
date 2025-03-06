/* eslint-disable @raycast/prefer-title-case */
import { Action, ActionPanel } from "@raycast/api";

import type { SearchResultDocument } from "@/types";

const CopyActions = ({ item }: { item: SearchResultDocument }) => {
  return (
    <ActionPanel.Section title="Copy Install Command">
      {item.runtimeCompat.node ? (
        <>
          <Action.CopyToClipboard
            title="npm (Node.js)"
            content={`npx jsr add ${item.id}`}
            icon={{ source: "npm.svg" }}
          />
          <Action.CopyToClipboard
            title="Yarn (Node.js)"
            content={`yarn dlx jsr add ${item.id}`}
            icon={{ source: "yarn.svg" }}
          />
          <Action.CopyToClipboard
            title="pnpm (Node.js)"
            content={`pnpm dlx jsr add ${item.id}`}
            icon={{ source: "pnpm.svg" }}
          />
        </>
      ) : null}
      {item.runtimeCompat.deno ? (
        <Action.CopyToClipboard title="Deno" content={`deno add ${item.id}`} icon={{ source: "deno.svg" }} />
      ) : null}
      {item.runtimeCompat.bun ? (
        <Action.CopyToClipboard title="Bun" content={`bunx jsr add ${item.id}`} icon={{ source: "bun.svg" }} />
      ) : null}
    </ActionPanel.Section>
  );
};

export default CopyActions;
