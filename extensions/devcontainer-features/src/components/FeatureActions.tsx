import { Action, ActionPanel, Icon } from "@raycast/api";
import type { Feature } from "../types";
import { getFeatureGitHubUrl } from "../utils/collection";
import { generateFullConfiguration } from "../utils/config";
import { FeatureDetail } from "./FeatureDetail";

interface FeatureActionsProps {
  feature: Feature;
  onRefresh?: () => void;
  showDetailAction?: boolean;
}

/**
 * Shared action panel for feature items
 */
export function FeatureActions({
  feature,
  onRefresh,
  showDetailAction = true,
}: FeatureActionsProps) {
  const githubUrl = getFeatureGitHubUrl(feature);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {showDetailAction && (
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<FeatureDetail feature={feature} />}
          />
        )}
        <Action.CopyToClipboard
          title="Copy Reference"
          content={`"${feature.reference}"`}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Reference Without Quotes"
          content={feature.reference}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {feature.documentationURL && (
          <Action.OpenInBrowser
            title="Open Documentation"
            url={feature.documentationURL}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        )}
        <Action.OpenInBrowser
          title="Open Source Repository"
          url={githubUrl}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Usage Example"
          content={`{\n  "features": {\n    "${feature.reference}": {}\n  }\n}`}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
        {feature.options && Object.keys(feature.options).length > 0 && (
          <Action.CopyToClipboard
            title="Copy Full Configuration"
            content={generateFullConfiguration(feature)}
            shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
          />
        )}
      </ActionPanel.Section>

      {onRefresh && (
        <ActionPanel.Section>
          <Action
            title="Refresh Features"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
