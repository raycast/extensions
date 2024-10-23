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
import { generatePrDescription } from "../../utils/ai";
import { getCurrentBranchName } from "../../utils/git";

export function GeneratePrDescriptionComponent(props: { repositoryPath: string; branchName: string }) {
  const [state, dispatch] = useReducer(reducer, initialState(props.repositoryPath, props.branchName));

  const preferences = getPreferenceValues<Preferences>();
  const prompt = preferences["pr-description-prompt"];

  const pastePrDescriptionAndClose = async () => {
    if (state.prDescription) {
      await Clipboard.paste(state.prDescription);
    } else {
      await popToRoot();
    }
  };

  const revalidate = () => {
    dispatch(["revalidate"]);
  };

  useEffect(() => {
    if (state.repositoryPath && state.currentBranchName) {
      dispatch(["set_loading", true]);
      generatePrDescription(state.repositoryPath, state.currentBranchName, state.baseBranchName, prompt)
        .then((prDescription) => dispatch(["set_pr_description", prDescription]))
        .catch((error) => dispatch(["set_error", error]))
        .finally(() => dispatch(["set_loading", false]));
    }
  }, [state.repositoryPath, state.currentBranchName, state.revalidationCount]);

  useEffect(() => {
    getFrontmostApplication().then((application) => {
      dispatch(["set_frontmost_application", application]);
    });
  });

  useEffect(() => {
    if (state.repositoryPath) {
      dispatch(["set_loading", true]);
      const currentBranch = getCurrentBranchName(state.repositoryPath);
      dispatch(["set_current_branch", currentBranch]);
      dispatch(["set_loading", false]);
    }
  }, [state.repositoryPath]);

  useEffect(() => {
    if (state.error) {
      showFailureToast(state.error, { title: "Failed to generate PR description" }).then();
    }
  }, [state.error]);

  return content(state, pastePrDescriptionAndClose, revalidate);
}

function content(state: State, primaryActionOnAction: () => void, secondaryActionOnAction: () => void) {
  if (state.error) {
    const markdown = `
  # We encountered an error while generating the PR description 😔
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
  ${state.isLoading ? "Generating PR Description for" : "Generated PR Description for"}

  \`${state.currentBranchName} -> ${state.baseBranchName}\`
  
  ${state.isLoading ? "# Generating.." : state.prDescription}
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
            <Action.CopyToClipboard content={state.prDescription || ""} />
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
