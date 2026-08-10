import { Action, ActionPanel, confirmAlert, Form, Icon, useNavigation } from "@raycast/api";
import { RepositoryContext } from "../../open-repository";
import { useState, useEffect, useMemo } from "react";
import { showFailureToast, useCachedState } from "@raycast/utils";

/**
 * Action to add files to Git LFS tracking.
 */
export function GitLFSAction(context: RepositoryContext & { filePath?: string }) {
  return (
    <Action.Push
      title="Add to Git LFS"
      icon={Icon.HardDrive}
      target={
        <GitLFSForm {...context} filePath={context.filePath != ".gitattributes" ? context.filePath : undefined} />
      }
    />
  );
}

function GitLFSForm(context: RepositoryContext & { filePath?: string }) {
  const { pop } = useNavigation();
  const [patterns, setPatterns] = useState(context.filePath ? [context.filePath] : []);
  const [updateIndex, setUpdateIndex] = useCachedState("git-lfs:updateIndex", true);
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
        setMatchedFiles(await context.gitManager.checkLFSPattern(nonEmptyPatterns));
      } catch {
        setMatchedFiles([]);
      }
    })();
  }, [patterns]);

  const handleSubmit = async () => {
    const isLFSFiltersSetup = await context.gitManager.checkLFSFilters();
    console.log("isLFSFiltersSetup", isLFSFiltersSetup);
    if (!isLFSFiltersSetup) {
      const confirmed = await confirmAlert({
        title: "Git LFS is not configured",
        message: "Would you like to setup it now?",
        primaryAction: { title: "Setup" },
      });
      if (!confirmed) return;
      await context.gitManager.setupLFSFilters();
    }

    const confirmed = await confirmAlert({
      title: "Add to Git LFS",
      message: "Are you sure you want to add the following patterns to .gitattributes?",
      primaryAction: {
        title: "Add",
      },
    });

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      await context.gitManager.addToGitLFS(patterns.filter(Boolean), updateIndex);
      context.status.revalidate();
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to add to Git LFS" });
    } finally {
      setIsLoading(false);
    }
  };

  const description = useMemo(() => {
    if (matchedFiles.length === 0) {
      return "No matched files";
    }

    return `${matchedFiles.length} file${matchedFiles.length === 1 ? "" : "s"} will be tracked by LFS:\n${matchedFiles
      .slice(0, 50)
      .map((file) => `• ${file}`)
      .join("\n")}${matchedFiles.length > 50 ? "\n... and more" : ""}`;
  }, [matchedFiles]);

  return (
    <Form
      navigationTitle="Add to Git LFS"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="pattern"
        title="Patterns"
        info="One pattern per line"
        placeholder={["*.zip", "*.psd"].join("\n")}
        value={patterns.join("\n")}
        onChange={(value) => setPatterns(value.split("\n"))}
        error={patterns.filter(Boolean).length === 0 ? "Required" : undefined}
      />

      <Form.Checkbox
        id="updateIndex"
        label="Migrate Existing Files"
        value={updateIndex}
        onChange={setUpdateIndex}
        info="This will migrate existing tracked files to Git LFS immediately"
      />

      <Form.Description text={description} />
    </Form>
  );
}
