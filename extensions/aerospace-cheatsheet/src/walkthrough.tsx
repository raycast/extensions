import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { recipeMarkdown } from "./lib/detail";
import type { ResolvedRecipe } from "./lib/recipes";

/**
 * The full-width walkthrough a recipe pushes to.
 *
 * This view exists so the step storyboard has room: it is 482px wide, which does not
 * fit the ~360px list detail pane. Everything else about the recipe is the same as
 * the compact version — only the diagram changes.
 */
export function Walkthrough({ recipe }: { recipe: ResolvedRecipe }) {
  return (
    <Detail
      navigationTitle={recipe.title}
      markdown={recipeMarkdown(recipe, { storyboard: true })}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Keys used">
            {recipe.resolved
              .filter((step) => step.keys)
              .map((step, index) => (
                <Detail.Metadata.TagList.Item key={`${step.keys}-${index}`} text={step.keys as string} />
              ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Steps" text={String(recipe.steps.length)} />
          {recipe.missing.length > 0 && (
            <Detail.Metadata.Label title="Unbound commands" text={recipe.missing.join(", ")} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Steps"
            icon={Icon.Clipboard}
            content={recipe.resolved
              .map((step, index) => `${index + 1}. ${step.keys ?? "(unbound)"} — ${step.instruction}`)
              .join("\n")}
          />
        </ActionPanel>
      }
    />
  );
}
