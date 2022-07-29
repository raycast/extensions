import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle, ImageMask, Color } from "@raycast/api";
import { useState, useEffect } from "react";

import { preferences } from "../../helpers/preferences";
import { pipelinesGetQuery, getCommitNames } from "../../queries";
import { Repository, Pipeline } from "./interface";
import { GoesToPreviousPipelinePage, GoesToNextPipelinePage } from "./actions";
import { icon } from "../../helpers/icon";

interface State {
  pipelines?: Pipeline[];
  error?: Error;
  isLoading?: boolean;
}

export function PipelinesList(props: { repo: Repository; pageNumber: number }): JSX.Element {
  const [state, setState] = useState<State>({ isLoading: true });
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    async function fetchPipelines() {
      try {
        setState({ isLoading: true });

        const { data } = await pipelinesGetQuery(props.repo.slug, pageNumber);

        const pipelines = data.values.map((pipeline: any) => ({
          name: (pipeline.name as string) || "",
          uuid: pipeline.uuid as string,
          buildNumber: pipeline.build_number.toString() as string,
          state: (pipeline.state?.result?.name || pipeline.state?.stage?.name || "") as string,
          avatarCreatorUrl: (pipeline.creator?.links?.avatar?.href as string) || "",
          triggerName: (pipeline.trigger?.name as string) || "",
          commitMessage: (pipeline.target?.commit?.message).split("\n")[0] || "",
          createdOn: pipeline.created_on as string,
        }));
        setState({ pipelines: pipelines, isLoading: false });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPipelines();
  }, [pageNumber]);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading repositories", state.error.message);
  }

  return (
    <List isLoading={!state.pipelines && !state.error && state.isLoading} searchBarPlaceholder="Search by name...">
      <List.Section
        title={`${props.repo.name} - Pipelines`}
        // subtitle={state.pipelines?.length + ""}
        subtitle={`(page ${pageNumber})`}
      >
        {state.pipelines?.map((pipeline) => (
          <SearchListItem
            key={pipeline.uuid}
            pipeline={pipeline}
            repoSlug={props.repo.slug}
            setPageNumber={setPageNumber}
            pageNumber={pageNumber}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  pipeline,
  repoSlug,
  setPageNumber,
  pageNumber,
}: {
  pipeline: Pipeline;
  repoSlug: string;
  setPageNumber: any;
  pageNumber: number;
}): JSX.Element {
  const { pipeline: pipeIcon } = icon;
  const statusIconUrl =
    pipeline.state == "SUCCESSFUL"
      ? pipeIcon.success
      : pipeline.state == "HALTED" || pipeline.state == "PAUSED"
      ? pipeIcon.paused
      : pipeline.state == "IN_PROGRESS"
      ? pipeIcon.progress
      : pipeline.state == "STOPPED"
      ? pipeIcon.stopped
      : pipeline.state == "FAILED"
      ? pipeIcon.failed
      : "";

  const pipelineImg = pipeline.avatarCreatorUrl
    ? pipeline.avatarCreatorUrl
    : pipeline.triggerName == "SCHEDULE"
    ? icon.calendar
    : icon.user;

  return (
    <List.Item
      title={pipeline.commitMessage || pipeline.uuid}
      subtitle={"#" + pipeline.buildNumber}
      accessoryTitle={pipeline.state}
      accessoryIcon={{ source: statusIconUrl }}
      // accessoryTitle={pipeline .name}
      icon={{ source: pipelineImg, mask: ImageMask.Circle }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction
              title="Open Pipeline in Browser"
              url={`https://bitbucket.org/${preferences.workspace}/${repoSlug}/addon/pipelines/home#!/results/${pipeline.buildNumber}`}
              icon={{ source: icon.code, tintColor: Color.PrimaryText }}
            />
          </ActionPanel.Section>

          {pageNumber <= 1 ? (
            <ActionPanel.Section>
              <GoesToNextPipelinePage setPageNumber={setPageNumber} pageNumber={pageNumber} />
            </ActionPanel.Section>
          ) : (
            <ActionPanel.Section>
              <GoesToPreviousPipelinePage setPageNumber={setPageNumber} pageNumber={pageNumber} />
              <GoesToNextPipelinePage setPageNumber={setPageNumber} pageNumber={pageNumber} />
            </ActionPanel.Section>
          )}

          {/* <DeleteAnnotationAction annotation={searchResult} /> */}
        </ActionPanel>
      }
    />
  );
}
