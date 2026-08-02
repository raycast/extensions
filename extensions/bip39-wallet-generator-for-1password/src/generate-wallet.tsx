import { Action } from "@raycast/api";

import { GeneratedWalletDetail } from "./generated-wallet-detail";

export default function Command() {
  return (
    <GeneratedWalletDetail
      onRecoveryPhraseAction={(result) => (
        <Action.CopyToClipboard
          concealed
          content={result.mnemonic}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          title="Copy Recovery Phrase"
        />
      )}
    />
  );
}
