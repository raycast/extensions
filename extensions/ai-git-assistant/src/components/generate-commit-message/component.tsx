import { useReducer, useEffect } from "react";
import {
  Icon,
  ActionPanel,
  Action,
  Detail,
  Clipboard,
  getFrontmostApplication,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";

import { showFailureToast } from "@raycast/utils";
import { State, initialState, reducer } from "./reducer";
import { retrieveAndSavePathToRepository } from "../../utils/git";
import { generateCommitMessage } from "../../utils/ai";

export function GenerateCommitMessageComponent() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const preferences = getPreferenceValues<Preferences>();
  const prompt = preferences["commit-message-prompt"];

  const pasteCommitMessageAndClose = async () => {
    if (state.commitMessage) {
      await Clipboard.paste(state.commitMessage);
    } else {
      await popToRoot();
    }
  };

  const revalidate = () => {
    dispatch(["revalidate"]);
  };

  useEffect(() => {
    dispatch(["set_loading", true]);
    retrieveAndSavePathToRepository()
      .then((path) => dispatch(["set_repository_path", path]))
      .catch((error) => dispatch(["set_error", error]))
      .finally(() => dispatch(["set_loading", false]));
  }, [state.revalidationCount]);

  useEffect(() => {
    if (state.repositoryPath) {
      dispatch(["set_loading", true]);
      generateCommitMessage(state.repositoryPath, prompt)
        .then((commitMessage) => dispatch(["set_commit_message", commitMessage]))
        .catch((error) => dispatch(["set_error", error]))
        .finally(() => dispatch(["set_loading", false]));
    }
  }, [state.repositoryPath, state.revalidationCount]);

  useEffect(() => {
    getFrontmostApplication().then((application) => {
      dispatch(["set_frontmost_application", application]);
    });
  });

  useEffect(() => {
    if (state.error) {
      showFailureToast(state.error, { title: "Failed to generate commit message" }).then();
    }
  }, [state.error]);

  return content(state, pasteCommitMessageAndClose, revalidate);
}

function content(state: State, primaryActionOnAction: () => void, secondaryActionOnAction: () => void) {
  if (state.error) {
    const markdown = `
  # We encountered an error while generating the commit message 😔
  ${state.error.message}
  `;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Regenerate"
              shortcut={{ modifiers: ["opt"], key: "r" }}
              icon={Icon.ArrowClockwise}
              onAction={secondaryActionOnAction}
            />
          </ActionPanel>
        }
      />
    );
  } else {
    const markdown = `
  ${state.isLoading ? "Generating Commit Message for" : "Generated Commit Message for"}

  ${state.repositoryPath ? `\`${state.repositoryPath}\`` : ""}
  # ${state.isLoading ? "Generating.." : state.commitMessage}
  `;

    return (
      <Detail
        markdown={markdown}
        isLoading={state.isLoading}
        actions={
          <ActionPanel>
            <Action
              title={state.isLoading ? "Cancel Generation" : `Paste Response to ${state.frontmostApplication}`}
              icon={state.isLoading ? Icon.XMarkCircleFilled : Icon.Clipboard}
              onAction={primaryActionOnAction}
            />
            <Action.CopyToClipboard content={state.commitMessage || ""} />
            <Action
              title="Regenerate"
              shortcut={{ modifiers: ["opt"], key: "r" }}
              icon={Icon.ArrowClockwise}
              onAction={secondaryActionOnAction}
            />
          </ActionPanel>
        }
      />
    );
  }
}
