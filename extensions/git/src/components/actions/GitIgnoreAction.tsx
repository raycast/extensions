import { Action, ActionPanel, confirmAlert, Form, Icon, useNavigation } from "@raycast/api";
import { RepositoryContext } from "../../open-repository";
import { useState, useEffect, useMemo } from "react";
import { showFailureToast } from "@raycast/utils";

/**
 * Action to add a file to .gitignore.
 */
export function GitIgnoreAction(context: RepositoryContext & { filePath?: string }) {
  return (
    <Action.Push
      // eslint-disable-next-line @raycast/prefer-title-case
      title="Add to .gitignore"
      icon={Icon.EyeDisabled}
      target={<GitIgnoreForm {...context} filePath={context.filePath != ".gitignore" ? context.filePath : undefined} />}
    />
  );
}

function GitIgnoreForm(context: RepositoryContext & { filePath?: string }) {
  const { pop } = useNavigation();
  const [patterns, setPatterns] = useState(context.filePath ? [context.filePath] : []);
  const [matchedFiles, setMatchedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const nonEmptyPatterns = patterns.filter(Boolean);
      if (nonEmptyPatterns.length === 0) {
        setMatchedFiles([]);
        return;
      }

      try {
        const ignored = await context.gitManager.checkIgnorePattern(nonEmptyPatterns);
        setMatchedFiles(ignored);
      } catch {
        setMatchedFiles([]);
      }
    })();
  }, [patterns]);

  const handleSubmit = async () => {
    const confirmed = await confirmAlert({
      title: "Add to .gitignore",
      message: "Are you sure you want to add the following patterns to .gitignore?",
      primaryAction: {
        title: "Add",
      },
    });

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      await context.gitManager.addToGitignore(patterns.filter(Boolean));
      context.status.revalidate();
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to add to .gitignore" });
    } finally {
      setIsLoading(false);
    }
  };

  // Format description with matched files
  const description = useMemo(() => {
    if (matchedFiles.length === 0) {
      return "No matched files";
    }

    const firstFive = matchedFiles.slice(0, 50);
    const moreCount = matchedFiles.length - 50;
    const filesList = firstFive.map((file) => `• ${file}`).join("\n");
    const moreText = moreCount > 0 ? `\n... and more` : "";

    return `${matchedFiles.length} file${matchedFiles.length === 1 ? "" : "s"} match${matchedFiles.length === 1 ? "es" : ""}:\n${filesList}${moreText}`;
  }, [matchedFiles]);

  return (
    <Form
      navigationTitle="Add to .gitignore"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" onSubmit={handleSubmit} icon={Icon.Plus} />

          <Action.Open
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Open .gitignore"
            icon={Icon.Document}
            target={context.gitManager.gitignorePath}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="pattern"
        title="Patterns"
        info="One pattern per line"
        placeholder={["*.log", "node_modules/"].join("\n")}
        value={patterns.join("\n")}
        onChange={(value) => setPatterns(value.split("\n"))}
        error={patterns.filter(Boolean).length === 0 ? "Required" : undefined}
      />

      <Form.Description text={description} />
    </Form>
  );
}
