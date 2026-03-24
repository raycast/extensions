// --------------------------------------------------------------------------
// Rival Raycast Extension - Compare Detail View
//
// Shared detail view that shows a side-by-side markdown comparison of two
// models. Used by both the search-models "Compare with Another Model" action
// and the compare-models two-step picker flow.
// --------------------------------------------------------------------------

import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import {
  buildComparisonMarkdown,
  compareUrl,
  labUrl,
  modelUrl,
} from "./utils.js";
import type { LensModel } from "./types.js";

interface CompareDetailProps {
  modelA: LensModel;
  modelB: LensModel;
}

export default function CompareDetail({ modelA, modelB }: CompareDetailProps) {
  const { pop, push } = useNavigation();
  const markdown = buildComparisonMarkdown(modelA, modelB);

  return (
    <Detail
      navigationTitle={`${modelA.name} vs ${modelB.name}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="Open Comparison on Rival"
              url={compareUrl(modelA.id, modelB.id)}
              icon={Icon.Globe}
            />
            <Action.OpenInBrowser
              title={`Open ${modelA.name} on Rival`}
              url={modelUrl(modelA.id)}
              icon={Icon.Globe}
            />
            <Action.OpenInBrowser
              title={`Open ${modelB.name} on Rival`}
              url={modelUrl(modelB.id)}
              icon={Icon.Globe}
            />
            <Action.OpenInBrowser
              title="Compare Your Prompt"
              url={labUrl()}
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Actions">
            <Action
              title="Swap Models"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => {
                // Reason: Pop the current detail and push a new one with swapped models.
                // This gives the user a clean back-navigation experience.
                pop();
                push(<CompareDetail modelA={modelB} modelB={modelA} />);
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy as Markdown"
              content={markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.CopyToClipboard
              title="Copy Comparison URL"
              content={compareUrl(modelA.id, modelB.id)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
