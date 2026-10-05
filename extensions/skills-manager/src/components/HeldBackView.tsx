import { Action, ActionPanel, Detail } from "@raycast/api";
import { UpdateResult } from "../lib/types";

/**
 * Shown when `skills update` withheld an update to protect files.
 *
 * An update replaces the skill's directory wholesale, so anything living inside
 * it that the new version does not ship would be destroyed. When the CLI spots
 * that it applies nothing and reports the paths instead.
 *
 * This is not a failure and must not be retried: the skill is intact on its old
 * version, and there is no CLI flag that overrides the check — only the desktop
 * app can confirm and proceed, because only a person can say those files are
 * expendable.
 */
export function HeldBackView({ results }: { results: UpdateResult[] }) {
  const withHoldbacks = results.filter((result) => result.held_back_removals !== undefined);

  const sections = withHoldbacks
    .map((result) => {
      const paths = (result.held_back_removals ?? []).map((entry) => `- \`${entry}\``).join("\n");
      return `### ${result.name}\n\n${paths}`;
    })
    .join("\n\n");

  const markdown = `# Update held back

${
  withHoldbacks.length === 1
    ? "This skill was left on its old version"
    : `${withHoldbacks.length} skills were left on their old versions`
} because the new version does not contain files that exist today. Updating replaces the skill's directory wholesale, so applying it would have deleted them.

${sections}

Paths are prefixed with where they live: \`library\` for the central copy, or an agent key for a deployed one.

## What to do

Nothing was changed and there is no reason to retry — this is the CLI protecting your files, not an error. Look at the paths above and decide:

- **They matter** → move them somewhere outside the skill folder, then update again.
- **They are expendable** → confirm the update in the **Skills Manager app**. There is no CLI flag for this on purpose; the decision needs a person.

## One thing this does not cover

A file you edited that the new version *also* ships is not listed here, because its path survives the update. Your edits to it will be overwritten silently. If you keep local modifications inside a skill folder, check for them before updating.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Held-Back Paths"
            content={withHoldbacks.flatMap((result) => result.held_back_removals ?? []).join("\n")}
          />
        </ActionPanel>
      }
    />
  );
}
