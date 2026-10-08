import React, { useReducer, useEffect } from "react";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";

import { showFailureToast } from "@raycast/utils";
import { State, initialState, reducer } from "./reducer";
import { getListOfBranches, pathToRepositoryName, retrieveAndSavePathToRepository } from "../../utils/git";
import { GeneratePrDescriptionComponent } from "../generate-pr-description/component";
import { Branch } from "../../models";

export function BranchListComponent() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { push } = useNavigation();

  const navigateToPrDescriptionGeneration = async (branch: Branch) => {
    push(<GeneratePrDescriptionComponent branchName={branch.name} repositoryPath={state.repositoryPath!} />);
  };

  useEffect(() => {
    dispatch(["set_loading", true]);
    retrieveAndSavePathToRepository()
      .then((path) => dispatch(["set_repository_path", path]))
      .catch((error) => dispatch(["set_error", error]))
      .finally(() => dispatch(["set_loading", false]));
  }, []);

  useEffect(() => {
    if (state.repositoryPath) {
      dispatch(["set_loading", true]);
      const branches = getListOfBranches(state.repositoryPath);
      dispatch(["set_branches", branches]);
      dispatch(["set_loading", false]);
    }
  }, [state.repositoryPath]);

  useEffect(() => {
    if (state.error) {
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
