import {
  Action,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";

import { GeneratedWalletDetail } from "./generated-wallet-detail";
import { confirmAndCopyRecoveryPhrase } from "./recovery-phrase-copy";

async function copyRecoveryPhrase(mnemonic: string) {
  const copied = await confirmAndCopyRecoveryPhrase(mnemonic, {
    confirm: () =>
      confirmAlert({
        title: "Copy Recovery Phrase?",
        message:
          "Anyone with this recovery phrase can control the wallet. Third-party clipboard managers may record it.",
        primaryAction: {
          title: "Copy Recovery Phrase",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
          style: Alert.ActionStyle.Cancel,
        },
      }),
    write: (content, options) => Clipboard.copy(content, options),
  });

  if (copied) {
    await showToast({
      style: Toast.Style.Success,
      title: "Recovery phrase copied",
    });
  }
}

export default function Command() {
  return (
    <GeneratedWalletDetail
      onRecoveryPhraseAction={(result) => (
        <Action
          icon={Icon.Clipboard}
          onAction={() => copyRecoveryPhrase(result.mnemonic)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          style={Action.Style.Destructive}
          title="Copy Recovery Phrase"
        />
      )}
      revealRecoveryPhraseAsPrimary
    />
  );
}
