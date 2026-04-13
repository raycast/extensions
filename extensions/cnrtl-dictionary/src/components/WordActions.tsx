import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import type { CnrtlEndpoint } from "../utils/types";
import { buildCnrtlUrl } from "../utils/constants";

interface WordActionsProps {
  word: string;
  currentEndpoint: CnrtlEndpoint;
  /** Optional text to copy to clipboard */
  copyContent?: string;
  /** Called after successfully copying */
  onCopied?: () => void;
}

/**
 * Shared action panel used by every command.
 * Provides: open in browser, copy content, navigation between endpoints.
 */
export function WordActions({ word, currentEndpoint, copyContent, onCopied }: WordActionsProps): JSX.Element {
  const otherEndpoints: Array<{ endpoint: CnrtlEndpoint; label: string; icon: Icon }> = [
    { endpoint: "definition", label: "Définition", icon: Icon.Book },
    { endpoint: "synonymie", label: "Synonymes", icon: Icon.Switch },
    { endpoint: "antonymie", label: "Antonymes", icon: Icon.ArrowsExpand },
    { endpoint: "etymologie", label: "Étymologie", icon: Icon.Clock },
    { endpoint: "morphologie", label: "Morphologie", icon: Icon.List },
  ].filter((e) => e.endpoint !== currentEndpoint);

  return (
    <ActionPanel>
      <ActionPanel.Section title={`« ${word} »`}>
        <Action.OpenInBrowser
          title="Ouvrir sur le CNRTL"
          url={buildCnrtlUrl(currentEndpoint, word)}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        {copyContent && (
          <Action.CopyToClipboard
            title="Copier le contenu"
            content={copyContent}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onCopy={onCopied}
          />
        )}
        <Action.CopyToClipboard
          title="Copier le mot"
          content={word}
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Explorer également">
        {otherEndpoints.map(({ endpoint, label, icon }) => (
          <Action.OpenInBrowser
            key={endpoint}
            title={`${label} sur le CNRTL`}
            url={buildCnrtlUrl(endpoint, word)}
            icon={icon}
          />
        ))}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Préférences de l'extension"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
