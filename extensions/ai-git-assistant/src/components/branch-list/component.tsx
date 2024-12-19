import React, { useReducer, useEffect } from "react";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";

import { showFailureToast } from "@raycast/utils";
import { State, initialState, reducer } from "./reducer";
import { getListOfBranches, pathToRepositoryName } from "../../utils/git";
import { GeneratePrDescriptionComponent } from "../generate-pr-description/component";
import { Branch } from "../../models";

export function BranchListComponent() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { push } = useNavigation();

  const navigateToPrDescriptionGeneration = async (branch: Branch) => {
    if (!state.repositoryPath) {
      showFailureToast(new Error("Repository path not found"));
      return;
    }
    push(<GeneratePrDescriptionComponent branchName={branch.name} repositoryPath={state.repositoryPath} />);
  };

  useEffect(() => {
    const fetchRepositoryPath = async () => {
      try {
        dispatch(["set_loading", true]);
        // 使用固定路徑作為 fallback
        const path = "/Users/chihkanglin/PlayGround/raycast/ai-git-assistant";

        if (!path) {
          throw new Error("No repository path found");
        }

        console.log("Retrieved repository path:", path);
        dispatch(["set_repository_path", path]);
      } catch (error) {
        console.error("Error fetching repository path:", error);
        dispatch(["set_error", error instanceof Error ? error : new Error(String(error))]);
      } finally {
        dispatch(["set_loading", false]);
      }
    };

    fetchRepositoryPath();
  }, []);

  useEffect(() => {
    if (state.repositoryPath) {
      try {
        dispatch(["set_loading", true]);
        console.log("Attempting to fetch branches for:", state.repositoryPath);
        const branches = getListOfBranches(state.repositoryPath);
        console.log("Retrieved branches:", branches);
        dispatch(["set_branches", branches]);
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        dispatch(["set_error", error instanceof Error ? error : new Error(String(error))]);
      } finally {
        dispatch(["set_loading", false]);
      }
    }
  }, [state.repositoryPath]);

  useEffect(() => {
    if (state.error) {
      console.error("Error state:", state.error);
      showFailureToast(state.error, { title: "Failed to show Git branches" }).then();
    }
  }, [state.error]);

  return content(state, navigateToPrDescriptionGeneration);
}

function content(state: State, primaryActionOnAction: (branch: Branch) => void) {
  return (
    <List
      navigationTitle={`Git Branches ${pathToRepositoryName(state.repositoryPath) || ""}`}
      isLoading={state.isLoading}
    >
      {state.branches?.length === 0 ? (
        <List.EmptyView title="No branches found" />
      ) : (
        state.branches?.map((item) => (
          <List.Item
            accessories={[
              {
                text: `${item.lastCommitAuthor}`,
                icon: Icon.Person,
                tooltip: `Last updated by ${item.lastCommitAuthor}`,
              },
              {
                tag: { value: new Date(item.lastCommitDate), color: Color.Green },
                tooltip: `Last updated ${item.lastCommitDate}`,
              },
            ]}
            key={item.name}
            title={item.name}
            actions={
              <ActionPanel>
                <Action title="Select Base" onAction={() => primaryActionOnAction(item)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
