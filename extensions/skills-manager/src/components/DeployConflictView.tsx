import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { adoptPath } from "../lib/api";
import { CliError } from "../lib/errors";
import { useCliAction } from "../hooks/useCliAction";
import { TargetConflict } from "../lib/types";
import { pluralize, tildePath } from "../lib/presentation";

/**
 * Shown when a deploy is refused because a target path holds something Skills
 * Manager does not own.
 *
 * The refusal is total and safe: no file at those paths was touched and no
 * other pair in the batch was applied. That is the important thing to say, so
 * it gets said plainly rather than compressed into a failure toast.
 *
 * The two ways forward are adopting the directory into the library or moving it
 * aside by hand. We offer the first and reveal the path for the second; the
 * extension never deletes or moves a file it did not create.
 */
export function DeployConflictView({
  conflicts,
  onResolved,
}: {
  conflicts: TargetConflict[];
  onResolved?: () => void;
}) {
  const { pop } = useNavigation();
  const runAction = useCliAction();

  const list = conflicts.map(({ path, reason }) => `- \`${tildePath(path)}\`\n  \n  ${reason}`).join("\n\n");

  const markdown = `# Deployment refused

${conflicts.length === 1 ? "One target is" : `${conflicts.length} targets are`} occupied by something Skills Manager does not manage:

${list}

**Nothing was changed.** The contents of ${conflicts.length === 1 ? "that path" : "those paths"} are untouched, and no other part of this deployment was applied either.

## How to continue

**Adopt it into the library** — Skills Manager takes ownership of what is already there, and it becomes a normal skill you can deploy and update. Adopted skills start as \`local\`, so they cannot auto-update from git until you re-point them at a source.

**Or move it aside yourself** and run the deployment again. Do that when the directory is something you want to keep outside Skills Manager.`;

  async function adopt(target: string) {
    await runAction({
      pending: `Adopting ${tildePath(target)}…`,
      // Adopting nothing exits zero, so an empty `adopted` list has to be
      // turned into a failure here — otherwise the user is told it worked and
      // walks straight back into the same conflict.
      run: async () => {
        const result = await adoptPath(target);
        if (!result?.adopted?.length) {
          const reason = result?.skipped?.[0]?.reason ?? "there is no skill to adopt at that path";
          throw new CliError("NOT_ADOPTABLE", `Nothing was adopted: ${reason}.`, JSON.stringify(result ?? {}));
        }
        return result;
      },
      success: (result) => ({
        title: `Adopted ${pluralize(result.adopted?.length ?? 0, "skill")}`,
        message: "Deploy again to finish what you started.",
      }),
      failureTitle: "Could not adopt",
      onSuccess: () => {
        onResolved?.();
        pop();
      },
    });
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Adopt into Library">
            {conflicts.map((conflict) => (
              <Action
                key={conflict.path}
                title={`Adopt ${tildePath(conflict.path)}`}
                icon={Icon.Download}
                onAction={() => adopt(conflict.path)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Inspect">
            {conflicts.map((conflict) => (
              <Action.ShowInFinder
                key={conflict.path}
                title={`Reveal ${tildePath(conflict.path)}`}
                path={conflict.path}
              />
            ))}
            <Action.CopyToClipboard
              title="Copy Conflicting Paths"
              content={conflicts.map((conflict) => conflict.path).join("\n")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
