import { Detail, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { calculateErgonomicScore } from "../util/ergonomicScore";

// Defines the structure of a shortcut item
interface ShortcutData {
  name: string;
  application: string;
  source: string;
  type: string;
  key: string;
  shortcut: string;
  control: boolean;
  shift: boolean;
  option: boolean;
  command: boolean;
  keyCode: string;
  keyName: string;
}

interface ShortcutDetailViewProps {
  shortcuts: ShortcutData[]; // All shortcuts for navigation
  initialIndex: number; // Starting index in the shortcuts array
  creationTime?: Date; // When the shortcuts were last updated
}

// Component that shows detailed information about a shortcut, including ergonomic analysis
export const ShortcutDetailView = ({ shortcuts, initialIndex, creationTime }: ShortcutDetailViewProps) => {
  const { pop } = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const shortcut = shortcuts[currentIndex];

  // Navigation handlers for moving between shortcuts
  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % shortcuts.length);
  };

  const handlePrevious = () => {
    setCurrentIndex((currentIndex - 1 + shortcuts.length) % shortcuts.length);
  };

  // Calculate ergonomic scores for the current shortcut
  const scores = calculateErgonomicScore(shortcut.keyName, {
    command: shortcut.command,
    option: shortcut.option,
    control: shortcut.control,
    shift: shortcut.shift,
  });

  // Get color coding for ergonomic scores
  const getScoreColor = (score: number) => {
    if (score >= 7) return { light: "#2D9D78", dark: "#2D9D78" }; // Good
    if (score >= 4) return { light: "#FF9F1C", dark: "#FF9F1C" }; // Medium
    return { light: "#FF4B4B", dark: "#FF4B4B" }; // Poor
  };

  const markdown = `
# ${shortcut.name} ${scores.oneHandedScore >= 3.8 ? "👋" : scores.twoHandedScore > 4 ? "👐" : "🤮"}
  *${shortcut.application}*
  ___
  
  ## Ergonomic Analysis
  
  An arbitrary score to help you understand how ergonomic your shortcut is.

  ### One-Handed Score: ${scores.oneHandedScore}/10
  ${scores.details.oneHanded.map((detail) => `- ${detail}`).join("\n")} 
  
  ### Two-Handed Score: ${scores.twoHandedScore}/10
  ${scores.details.twoHanded.map((detail) => `- ${detail}`).join("\n")}
  
  ### Disruption Score: ${scores.disruptionScore}/10
  ${scores.details.disruption.map((detail) => `- ${detail}`).join("\n")}
  *Note: The one-handed score is based on the key name, not the shortcut.*

  ___
  ## Developer Details
| **Shortcut Details** | **Modifier Keys** |
| :---: | :---: |
| Source: ${shortcut.source} | Command: ${shortcut.command} |
| Type: ${shortcut.type} | Option: ${shortcut.option} |
| Shortcut: ${shortcut.shortcut} | Shift: ${shortcut.shift} |
| Key Name: ${shortcut.keyName} | Control: ${shortcut.control} |
| Apple Script Key Code: ${shortcut.keyCode} | One Hand: ${scores.oneHandedScore > 4 ? "Yes" : "No"} |
___
*Last updated: ${creationTime ? creationTime.toLocaleString() : new Date().toLocaleString()}.*
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`${shortcut.application} Details`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Shortcut">
            {shortcut.command && (
              <Detail.Metadata.TagList.Item text="⌘" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.option && <Detail.Metadata.TagList.Item text="⌥" color={{ light: "#554b3f", dark: "#e5d8c9" }} />}
            {shortcut.shift && <Detail.Metadata.TagList.Item text="⇧" color={{ light: "#554b3f", dark: "#e5d8c9" }} />}
            {shortcut.control && (
              <Detail.Metadata.TagList.Item text="⌃" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.keyName === "delete" && (
              <Detail.Metadata.TagList.Item text="⌫" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.keyName === "return" && (
              <Detail.Metadata.TagList.Item text="↩" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.keyName === "escape" && (
              <Detail.Metadata.TagList.Item text="⎋" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.keyName === "up" && (
              <Detail.Metadata.TagList.Item text="↑" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.keyName === "down" && (
              <Detail.Metadata.TagList.Item text="↓" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.keyName === "left" && (
              <Detail.Metadata.TagList.Item text="←" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {shortcut.keyName === "right" && (
              <Detail.Metadata.TagList.Item text="→" color={{ light: "#554b3f", dark: "#e5d8c9" }} />
            )}
            {!["delete", "return", "escape", "up", "down", "left", "right"].includes(shortcut.keyName) && (
              <Detail.Metadata.TagList.Item
                text={shortcut.keyName.toUpperCase()}
                color={{ light: "#554b3f", dark: "#e5d8c9" }}
              />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="One-Handed Score">
            <Detail.Metadata.TagList.Item
              text={`${scores.oneHandedScore}/10`}
              color={getScoreColor(scores.oneHandedScore)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Two-Handed Score">
            <Detail.Metadata.TagList.Item
              text={`${scores.twoHandedScore}/10`}
              color={getScoreColor(scores.twoHandedScore)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Disruption Score">
            <Detail.Metadata.TagList.Item
              text={`${scores.disruptionScore}/10`}
              color={getScoreColor(scores.disruptionScore)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="View Navigation">
            <Detail.Metadata.TagList.Item
              text="Press ← or → to navigate"
              color={{ light: "#554b3f", dark: "#e5d8c9" }}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Previous Shortcut"
              onAction={handlePrevious}
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
            />
            <Action
              title="Next Shortcut"
              onAction={handleNext}
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: [], key: "arrowRight" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Close View"
              onAction={pop}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              icon={Icon.XMarkCircle}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
