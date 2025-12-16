import { ActionPanel, Action, Icon } from "@raycast/api";
import type { CheckTextResponse } from "../types";

type ResultActionsProps = {
  result: CheckTextResponse;
  appliedSuggestions: Set<number>;
  applyAllAndPaste: () => Promise<void>;
  pasteText: () => Promise<void>;
  copyToClipboard: () => Promise<void>;
  applyAllSuggestions: () => Promise<void>;
  resetCorrections: () => void;
  applySuggestion: (index: number) => Promise<void>;
};

export function ResultActions({
  result,
  appliedSuggestions,
  applyAllAndPaste,
  pasteText,
  copyToClipboard,
  applyAllSuggestions,
  resetCorrections,
  applySuggestion,
}: ResultActionsProps) {
  const matchesCount = result.matches?.length || 0;
  const appliedCount = appliedSuggestions.size;

  return (
    <ActionPanel>
      {/* Primary Action */}
      {matchesCount > 0 ? (
        <ActionPanel.Section title="Quick Actions">
          <Action
            title="Apply All & Paste"
            icon={Icon.Wand}
            onAction={applyAllAndPaste}
            shortcut={{
              Windows: { modifiers: ["ctrl"], key: "return" },
              macOS: { modifiers: ["cmd"], key: "return" },
            }}
          />
        </ActionPanel.Section>
      ) : (
        <ActionPanel.Section title="Quick Actions">
          <Action
            title="Paste Text"
            icon={Icon.Text}
            onAction={pasteText}
            shortcut={{
              Windows: { modifiers: ["ctrl"], key: "return" },
              macOS: { modifiers: ["cmd"], key: "return" },
            }}
          />
        </ActionPanel.Section>
      )}

      {/* Text Actions */}
      <ActionPanel.Section title="Text Actions">
        <Action
          title="Copy Corrected Text"
          icon={Icon.Clipboard}
          onAction={copyToClipboard}
        />
        {matchesCount > 0 && (
          <Action
            title="Paste Corrected Text"
            icon={Icon.Text}
            onAction={pasteText}
          />
        )}
      </ActionPanel.Section>

      {/* Correction Actions */}
      {matchesCount > 0 && (
        <ActionPanel.Section title="Corrections">
          <Action
            title="Apply All Suggestions"
            icon={Icon.CheckCircle}
            onAction={applyAllSuggestions}
            shortcut={{
              Windows: { modifiers: ["ctrl", "shift"], key: "a" },
              macOS: { modifiers: ["cmd", "shift"], key: "a" },
            }}
          />
          {appliedCount > 0 && (
            <Action
              title="Reset Corrections"
              icon={Icon.Undo}
              onAction={resetCorrections}
              shortcut={{
                Windows: { modifiers: ["ctrl"], key: "r" },
                macOS: { modifiers: ["cmd"], key: "r" },
              }}
            />
          )}
        </ActionPanel.Section>
      )}

      {/* Individual Corrections */}
      {result.matches &&
        result.matches.map((match, index) => {
          if (appliedSuggestions.has(index)) return null;

          return (
            <ActionPanel.Section
              key={index}
              title={`Fix: ${match.shortMessage || match.message}`}
            >
              <Action
                title={`Apply: "${match.replacements[0]?.value}"`}
                icon={Icon.Check}
                onAction={() => applySuggestion(index)}
              />
            </ActionPanel.Section>
          );
        })}
    </ActionPanel>
  );
}
