import { Action, open, useNavigation } from "@raycast/api";
import { RepositoryContext } from "../../open-repository";
import { RemoteEditorForm } from "./RemoteActions";

/**
 * Opens GitHub's "Create new repository" page with the repository name pre-filled,
 * then pushes the Add Remote form with typical origin + HTTPS URL placeholders.
 */
export function CreateGitHubRepositoryAction(context: RepositoryContext) {
  const { push } = useNavigation();
  const repoName = context.gitManager.repoName;
  const createPageUrl = `https://github.com/new?name=${encodeURIComponent(repoName)}`;
  const prefilledUrl = `https://github.com/YOUR_USERNAME/${repoName}.git`;

  return (
    <Action
      title="Create GitHub Repository"
      icon={"github.svg"}
      shortcut={{ modifiers: ["shift", "cmd"], key: "n" }}
      onAction={async () => {
        await open(createPageUrl);
        push(
          <RemoteEditorForm
            {...context}
            defaultRemoteName="origin"
            defaultFetchUrl={prefilledUrl}
            defaultPushUrl={prefilledUrl}
          />,
        );
      }}
    />
  );
}
