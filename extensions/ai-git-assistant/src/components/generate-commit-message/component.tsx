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
    const fullPath = "/Users/chihkanglin/PlayGround/raycast/ai-git-assistant";
    console.log("Current repository path:", fullPath);

    if (!fullPath) {
      console.log("No repository path found");
      dispatch(["set_error", new Error("找不到儲存庫路徑")]);
      return;
    }

    // 設置倉庫路徑到 state
    dispatch(["set_repository_path", fullPath]);
    dispatch(["set_loading", true]);
    console.log("Attempting to generate commit message for path:", fullPath);

    generateCommitMessage(fullPath, prompt)
      .then((commitMessage) => {
        // 確保每個項目都在新行
        const formattedMessage = commitMessage.split("• ").join("\n• ").trim();
        console.log("Successfully generated commit message");
        dispatch(["set_commit_message", formattedMessage]);
      })
      .catch((error) => {
        console.log("Error generating commit message:", error);
        const errorMessage = error.message.includes("git repository")
          ? `無效的 Git 儲存庫路徑：${fullPath}。請確認該路徑包含 .git 目錄。`
          : error.message;
        dispatch(["set_error", new Error(errorMessage)]);
      })
      .finally(() => {
        dispatch(["set_loading", false]);
      });
  }, [state.revalidationCount]);

  useEffect(() => {
    getFrontmostApplication().then((application) => {
      dispatch(["set_frontmost_application", application]);
    });
  }, []);

  useEffect(() => {
    if (state.error) {
      console.log("Error state:", state.error);
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
# Generated Commit Message for
\`${state.repositoryPath || ""}\`

${state.isLoading ? "Generating.." : state.commitMessage}
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
