import { ActionPanel, List, showToast, Color, Action, Image, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { preferences } from "../../helpers/preferences";
import { pipelinesGetQuery } from "../../queries";
import { Repository, Pipeline } from "./interface";
import { GoesToPreviousPipelinePage, GoesToNextPipelinePage } from "./actions";
import { icon } from "../../helpers/icon";

interface State {
  pipelines?: Pipeline[];
  error?: Error;
  isLoading?: boolean;
}

export function PipelinesList(props: { repo: Repository; pageNumber: number }) {
  const [state, setState] = useState<State>({ isLoading: true });
  const [pageNumber, setPageNumber] = useState<number>(1);

  useEffect(() => {
    async function fetchPipelines() {
      try {
        setState({ isLoading: true });

        const { data } = await pipelinesGetQuery(props.repo.slug, pageNumber);

        const pipelines =
          data.values?.map((pipeline) => ({
            name: (pipeline.name as string) || "",
            uuid: pipeline.uuid as string,
            buildNumber: pipeline?.build_number?.toString() as string,
            state: (pipeline.state?.name == "IN_PROGRESS"
              ? "IN_PROGRESS"
              : // @ts-expect-error: To keep the original code
                // eslint-disable-next-line no-constant-binary-expression
                null || pipeline.state?.result?.name || pipeline.state?.stage?.name || "") as string,
            avatarCreatorUrl: (pipeline.creator?.links?.avatar?.href as string) || "",
            triggerName: (pipeline.trigger?.name as string) || "",
            // @ts-expect-error: To keep the original code
            // eslint-disable-next-line no-unsafe-optional-chaining
            commitMessage: (pipeline.target?.commit?.message).split("\n")[0] || "",
            createdOn: pipeline.created_on as string,
          })) ?? [];
        // @ts-expect-error: To keep the original code
        setState({ pipelines: pipelines, isLoading: false });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPipelines();
  }, [pageNumber]);

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading repositories",
      message: state.error.message,
    });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPageNumber: any;
  pageNumber: number;
}) {
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
      // accessoryTitle={pipeline .name}
      icon={{ source: pipelineImg, mask: Image.Mask.Circle }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
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
      accessories={[
        {
          text: pipeline.state,
          icon: { source: statusIconUrl },
        },
      ]}
    />
  );
}
