import { useState, useEffect } from "react";
import { ActionPanel, Action, List } from "@raycast/api";
import { convertGrade, identifyGradeSystem, GradeSystem, isValidGrade } from "./converter";

interface CommandArgs {
  query?: string;
}

export default function Command(props: { arguments?: CommandArgs }) {
  const [fromGrade, setFromGrade] = useState<string>("");
  const [toGrade, setToGrade] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  useEffect(() => {
    // Initialize with empty state or with the query from arguments
    const initialQuery = props.arguments?.query || "";
    if (initialQuery) {
      parseAndConvert(initialQuery);
      setHasSearched(true);
    } else {
      setIsLoading(false);
    }
  }, [props.arguments?.query]);

  const parseAndConvert = (text: string) => {
    if (!text.trim()) {
      setFromGrade("");
      setToGrade("");
      setError(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const lowercaseText = text.toLowerCase();

      // Check if the input contains "to" or "in" to determine the target system
      const toIndex = lowercaseText.indexOf(" to ");
      const inIndex = lowercaseText.indexOf(" in ");

      let inputGrade: string;
      let sourceSystem: GradeSystem | null;
      let targetSystem: GradeSystem | null;

      if (toIndex !== -1) {
        // Format: "7a to v-scale"
        inputGrade = lowercaseText.substring(0, toIndex).trim();
        sourceSystem = identifyGradeSystem(inputGrade);
        const targetSystemStr = lowercaseText.substring(toIndex + 4).trim();
        targetSystem = targetSystemStr.toLowerCase().includes("font")
          ? GradeSystem.FONT
          : targetSystemStr.toLowerCase().includes("v")
            ? GradeSystem.V_SCALE
            : null;
      } else if (inIndex !== -1) {
        // Format: "7a in v-scale"
        inputGrade = lowercaseText.substring(0, inIndex).trim();
        sourceSystem = identifyGradeSystem(inputGrade);
        const targetSystemStr = lowercaseText.substring(inIndex + 4).trim();
        targetSystem = targetSystemStr.toLowerCase().includes("font")
          ? GradeSystem.FONT
          : targetSystemStr.toLowerCase().includes("v")
            ? GradeSystem.V_SCALE
            : null;
      } else {
        // Try to identify just the grade
        inputGrade = lowercaseText;
        sourceSystem = identifyGradeSystem(inputGrade);
        // If source is Font, target is V-Scale and vice versa
        targetSystem = sourceSystem === GradeSystem.FONT ? GradeSystem.V_SCALE : GradeSystem.FONT;
      }

      if (!sourceSystem) {
        setError("Could not identify the grading system");
        setIsLoading(false);
        return;
      }

      if (!targetSystem) {
        setError("Supported systems: Font, V-Scale");
        setIsLoading(false);
        return;
      }

      // Clean up the input grade
      const cleanGrade = inputGrade
        .replace(/font/i, "")
        .replace(/v-?scale/i, "")
        .replace(/^v/i, "") // Remove leading V
        .trim();

      if (!isValidGrade(cleanGrade, sourceSystem)) {
        setError(`"${cleanGrade}" is not a valid grade in the ${sourceSystem} system`);
        setIsLoading(false);
        return;
      }

      // Convert the grade
      const convertedGrade = convertGrade(cleanGrade, sourceSystem, targetSystem);

      // Format the grades properly with proper prefixes
      setFromGrade(sourceSystem === GradeSystem.FONT ? `Font ${cleanGrade}` : `V${cleanGrade}`);

      // Fix for the double "V" issue
      if (targetSystem === GradeSystem.V_SCALE) {
        // Make sure we don't add a V if it's already there
        setToGrade(convertedGrade.toLowerCase().startsWith("v") ? convertedGrade : `V${convertedGrade}`);
      } else {
        setToGrade(`Font ${convertedGrade}`);
      }
    } catch (error) {
      console.error(error);
      setError("Failed to convert grade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter grade (e.g., '7a in v-scale' or 'v5 to font')"
      onSearchTextChange={parseAndConvert}
      throttle
    >
      {error ? (
        <List.Section title="Error">
          <List.Item title={error} icon={{ source: "⚠️" }} />
        </List.Section>
      ) : fromGrade && toGrade ? (
        <List.Section title="Conversion Result">
          <List.Item
            title={`${fromGrade} = ${toGrade}`}
            subtitle="Climbing Grade Conversion"
            icon={{ source: "✅" }}
            accessories={[
              {
                text: "Press ⌘+C to copy, ⌘+P to paste",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Conversion Result"
                  content={`${fromGrade} = ${toGrade}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.Paste
                  title="Paste Conversion Result"
                  content={`${fromGrade} = ${toGrade}`}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
                <Action
                  title="New Conversion"
                  onAction={() => {
                    setFromGrade("");
                    setToGrade("");
                    setError(null);
                    setHasSearched(false);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : !hasSearched ? (
        <List.Section title="Examples (click or search above)">
          <List.Item
            title="7a in v-scale"
            subtitle="Font to V-Scale"
            actions={
              <ActionPanel>
                <Action title="Use This Example" onAction={() => parseAndConvert("7a in v-scale")} />
              </ActionPanel>
            }
          />
          <List.Item
            title="v5 to font"
            subtitle="V-Scale to Font"
            actions={
              <ActionPanel>
                <Action title="Use This Example" onAction={() => parseAndConvert("v5 to font")} />
              </ActionPanel>
            }
          />
          <List.Item
            title="7b+"
            subtitle="Auto-detect Font grade"
            actions={
              <ActionPanel>
                <Action title="Use This Example" onAction={() => parseAndConvert("7b+")} />
              </ActionPanel>
            }
          />
          <List.Item
            title="v3"
            subtitle="Auto-detect V-Scale grade"
            actions={
              <ActionPanel>
                <Action title="Use This Example" onAction={() => parseAndConvert("v3")} />
              </ActionPanel>
            }
          />

          <List.Item
            title="How To Use"
            subtitle="Instructions"
            accessories={[{ text: "Type a grade in the search bar above" }]}
          />
        </List.Section>
      ) : (
        <List.EmptyView
          title="No conversion found"
          description="Try a different grade or format like '7a in v-scale' or 'v5 to font'"
        />
      )}
    </List>
  );
}
