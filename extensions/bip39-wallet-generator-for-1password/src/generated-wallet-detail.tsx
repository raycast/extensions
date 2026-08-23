import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  environment,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import type { ReactElement } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { addressCardDataUri, phraseCardDataUri } from "./phrase-card";
import type { WalletResult } from "./types";
import { buildWalletResult, generateMnemonic } from "./wallet";
import {
  applyWalletReplacement,
  createInitialWalletState,
  needsPreferenceReplacement,
  prepareWalletReplacement,
  WALLET_REPLACEMENT_WARNING,
  type WalletWordCount,
} from "./wallet-replacement";

interface GeneratedWalletDetailProps {
  onRecoveryPhraseAction: (result: WalletResult) => ReactElement;
  revealRecoveryPhraseAsPrimary?: boolean;
}

function buildMarkdown(result: WalletResult, revealed: boolean): string {
  const phrase = phraseCardDataUri(
    result.mnemonic.split(" "),
    revealed,
    environment.appearance,
  );
  const addresses = addressCardDataUri(result.chains, environment.appearance);
  const hint = revealed
    ? "_Anyone with these words controls the wallet. Press **⌘S** to hide._"
    : "_Hidden for safety. Press **⌘S** to reveal._";

  return `![Recovery phrase](${phrase})

${hint}

![Public addresses](${addresses})`;
}

function preferredWalletWordCount(): WalletWordCount {
  return getPreferenceValues<ExtensionPreferences>().wordCount === "24"
    ? 24
    : 12;
}

function generateWalletResult(wordCount: WalletWordCount): WalletResult {
  return buildWalletResult(generateMnemonic(wordCount));
}

export function GeneratedWalletDetail({
  onRecoveryPhraseAction,
  revealRecoveryPhraseAsPrimary = false,
}: GeneratedWalletDetailProps) {
  const preferredWordCount = preferredWalletWordCount();
  const [walletState, setWalletState] = useState(() =>
    createInitialWalletState(preferredWordCount, generateWalletResult),
  );
  const replacementRequestEpoch = useRef(0);
  const lastObservedPreferredWordCountRef = useRef(preferredWordCount);

  const runConfirmedReplacement = useCallback(
    async (targetWordCount: WalletWordCount, requestId: number) => {
      const isRequestCurrent = () =>
        requestId === replacementRequestEpoch.current &&
        targetWordCount === preferredWalletWordCount();
      const outcome = await prepareWalletReplacement(targetWordCount, {
        confirm: () =>
          confirmAlert({
            icon: Icon.Warning,
            title: "Generate New Wallet?",
            message: WALLET_REPLACEMENT_WARNING,
            primaryAction: {
              title: "Discard and Generate",
              style: Alert.ActionStyle.Destructive,
            },
            dismissAction: {
              title: "Keep Current Wallet",
              style: Alert.ActionStyle.Cancel,
            },
          }),
        generate: generateWalletResult,
        isCurrent: isRequestCurrent,
      });

      if (outcome.status !== "replacement" || !isRequestCurrent()) {
        return;
      }

      setWalletState((current) => applyWalletReplacement(current, outcome));

      await showToast({
        message: `EVM ${outcome.result.chains.evm.address.slice(0, 12)}…`,
        style: Toast.Style.Success,
        title: "New wallet generated",
      });
    },
    [],
  );

  const regenerateWallet = useCallback(async () => {
    const requestId = ++replacementRequestEpoch.current;
    await runConfirmedReplacement(preferredWordCount, requestId);
  }, [preferredWordCount, runConfirmedReplacement]);

  useEffect(() => {
    if (lastObservedPreferredWordCountRef.current === preferredWordCount) {
      return;
    }

    lastObservedPreferredWordCountRef.current = preferredWordCount;
    const requestId = ++replacementRequestEpoch.current;

    if (
      !needsPreferenceReplacement(
        walletState.generatedWordCount,
        preferredWordCount,
      )
    ) {
      return;
    }

    void runConfirmedReplacement(preferredWordCount, requestId);
  }, [
    preferredWordCount,
    runConfirmedReplacement,
    walletState.generatedWordCount,
  ]);

  useEffect(
    () => () => {
      replacementRequestEpoch.current += 1;
    },
    [],
  );

  const { result, revealed } = walletState;

  const toggleRecoveryPhrase = useCallback(() => {
    setWalletState((current) => ({
      ...current,
      revealed: !current.revealed,
    }));
  }, []);

  const revealRecoveryPhraseAction = (
    <Action
      icon={revealed ? Icon.EyeDisabled : Icon.Eye}
      onAction={toggleRecoveryPhrase}
      shortcut={Keyboard.Shortcut.Common.Save}
      title={revealed ? "Hide Recovery Phrase" : "Reveal Recovery Phrase"}
    />
  );

  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Wallet">
            {revealRecoveryPhraseAsPrimary
              ? revealRecoveryPhraseAction
              : onRecoveryPhraseAction(result)}
            {revealRecoveryPhraseAsPrimary
              ? onRecoveryPhraseAction(result)
              : null}
            <Action
              icon={Icon.ArrowClockwise}
              onAction={regenerateWallet}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Generate New Wallet"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Public Addresses">
            <Action.CopyToClipboard
              content={result.chains.btc.address}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              title="Copy BTC Address"
            />
            <Action.CopyToClipboard
              content={result.chains.evm.address}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              title="Copy ETH Address"
            />
            <Action.CopyToClipboard
              content={result.chains.sol.address}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              title="Copy SOL Address"
            />
          </ActionPanel.Section>
          {!revealRecoveryPhraseAsPrimary ? (
            <ActionPanel.Section>
              {revealRecoveryPhraseAction}
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
      markdown={buildMarkdown(result, revealed)}
    />
  );
}
