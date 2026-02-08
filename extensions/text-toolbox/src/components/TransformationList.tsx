import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { Transformation, transformationCategories } from "../transformations";
import { useMemo } from "react";

interface TransformationListProps {
  inputText: string;
  transformationChain?: Transformation[];
}

interface Preferences {
  [key: string]: boolean;
}

function truncateText(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "\n\n*(truncated...)*";
}

function buildDetailMarkdown(result: string, inputText: string, transformationChain: Transformation[]): string {
  // Build the chain of results
  const steps: Array<{ name: string; result: string }> = [{ name: "Input", result: inputText }];

  let currentText = inputText;
  for (const transformation of transformationChain) {
    try {
      currentText = transformation.transform(currentText);
      steps.push({ name: transformation.name, result: currentText });
    } catch (error) {
      steps.push({ name: transformation.name, result: `Error: ${error}` });
      break;
    }
  }

  // Show result at top
  const resultSection = `\n\`\`\`\n${truncateText(result)}\n\`\`\``;

  // Show steps in reverse order (most recent first, input last)
  const stepsSection = steps
    .slice()
    .reverse()
    .map((step) => `${step.name}\n\`\`\`\n${truncateText(step.result)}\n\`\`\``)
    .join("\n\n");

  return `${resultSection}\n\n&nbsp;\n\n${stepsSection}`;
}

export default function TransformationList({ inputText, transformationChain = [] }: TransformationListProps) {
  const preferences = getPreferenceValues<Preferences>();

  const categoryResults = useMemo(() => {
    return transformationCategories
      .map((category) => ({
        name: category.name,
        results: category.transformations
          .filter((t) => preferences[t.preferenceKey])
          .map((t) => ({
            transformation: t,
            result: t.transform(inputText),
          })),
      }))
      .filter((category) => category.results.length > 0);
  }, [inputText, preferences]);

  const chainTitle = transformationChain.length > 0 ? ` → ${transformationChain.map((t) => t.name).join(" → ")}` : "";
  const navigationTitle = `Select Transformation${chainTitle}`;

  if (!inputText) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Input Text"
          description="No text available to transform"
        />
      </List>
    );
  }

  return (
    <List navigationTitle={navigationTitle} searchBarPlaceholder="Search transformations..." isShowingDetail={true}>
      {categoryResults.map((category) => (
        <List.Section key={category.name} title={category.name}>
          {category.results.map(({ transformation, result }) => {
            const newChain = [...transformationChain, transformation];

            return (
              <List.Item
                id={transformation.id}
                key={transformation.id}
                icon={transformation.icon}
                title={transformation.name}
                subtitle={transformation.description}
                detail={<List.Item.Detail markdown={buildDetailMarkdown(result, inputText, transformationChain)} />}
                actions={
                  <ActionPanel>
                    <Action.Paste
                      title="Paste Result"
                      content={result}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                    <Action.Push
                      title="Apply Another Transformation"
                      icon={Icon.ArrowRight}
                      target={<TransformationList inputText={result} transformationChain={newChain} />}
                      shortcut={{ modifiers: [], key: "arrowRight" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={result}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
