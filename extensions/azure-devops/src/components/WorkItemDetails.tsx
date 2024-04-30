import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import html2md from "html-to-md";
import AzureDevOpsApiClient from "../api/client";
import { WorkItemExtended } from "../utils/types";
import { toSnakeCase } from "../utils/helpers";

interface State {
  item?: WorkItemExtended;
  error?: Error;
}

export default function WorkItemDetails(props: { itemId: number }) {
  const [state, setState] = useState<State>({});
  const [branchName, setBranchName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const { orgUrl, token } = getPreferenceValues<Preferences>();
  const apiClient = new AzureDevOpsApiClient(orgUrl, token);

  useEffect(() => {
    async function loadWorkItem() {
      try {
        const item = await apiClient.getWorkItem(props.itemId);
        setState({ item });
        setBranchName(`${item.id.toString()}_${toSnakeCase(item.fields?.["System.Title"])}`);
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("An error occurred while fetching work item."),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkItem();
  }, []);

  function getNavigationTitle(): string {
    return isLoading ? "Loading..." : state.item?.fields?.["System.Title"] ?? "Work Item";
  }

  function getMarkdown(): string {
    const title = `<h2>${state.item?.fields?.["System.Title"]}</h2> <hr/>`;
    const description = state.item?.fields?.["System.Description"] ?? "";

    return isLoading ? "Loading..." : html2md(title + description);
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown()}
      navigationTitle={getNavigationTitle()}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Id" text={state.item?.id.toString()} />
          <Detail.Metadata.Label title="Type" text={state.item?.fields?.["System.WorkItemType"]} />
          <Detail.Metadata.Label title="State" text={state.item?.fields?.["System.State"]} />
          <Detail.Metadata.Label title="Assigned To" text={state.item?.fields?.["System.AssignedTo"]?.displayName} />
          <Detail.Metadata.Label title="Created On" text={state.item?.fields?.["System.CreatedDate"]} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Edit"
            target={(state.item?._links?.html.href as string) || "#"}
            text="Edit item"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title="Quick actions">
          <ActionPanel.Section>
            <Action.OpenInBrowser url={state.item?._links?.html.href as string} />
            <Action.CopyToClipboard
              title="Copy Branch Name"
              shortcut={{ modifiers: ["cmd"], key: "." }}
              content={branchName}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
