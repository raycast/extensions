import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  randomId,
  PushAction,
  Detail,
  ImageMask,
  FormTextField,
  Icon,
  ListItem,
  Color
} from "@raycast/api";
import {
  ShowPipelinesActions
} from "./actions";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

import { preferences } from "../../helpers/preferences";
import { pipelinesGetQuery } from "./queries";
import { Repository } from "./interface";
import { Json } from "../../helpers/types";

interface State {
  pipelines?: Pipeline[];
  error?: Error;
}

interface Pipeline {
  uuid: string;
  name: string;
  buildNumber: string;
  state: string;
  avatarCreatorUrl: string;
  triggerName: string;
}

const icon = {
  pipeline: {
    success: "icon-pipeline-success.png",
    failed: "icon-pipeline-failed.png",
    paused: "icon-pipeline-paused.png",
    progress: "icon-pipeline-progress.png",
    stopped: "icon-pipeline-stopped.png"
  }
}

export function PipelinesList(props: { repo: Repository }): JSX.Element {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    async function fetchPipelines() {
      try {
        const response = await pipelinesGetQuery(props.repo.slug)

        if (!response.ok) {
          return Promise.reject(response.statusText);
        }

        const pipelinesJson = (await response.json()).values as Json[];

        const pipelines = pipelinesJson
          .map((pipeline: any) => {
            console.log(pipeline.state);

            return {
              name: pipeline.name as string || "",
              uuid: pipeline.uuid as string,
              buildNumber: pipeline.build_number.toString() as string,
              state: (pipeline.state?.result?.name || pipeline.state?.stage?.name || '') as string,
              avatarCreatorUrl: pipeline.creator?.links?.avatar?.href as string || '',
              triggerName: pipeline.trigger?.name as string || '',
            };
          });
        setState({ pipelines: pipelines });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchPipelines();
  }, []);

  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading repositories", state.error.message);
  }

  return (
    <List isLoading={!state.pipelines && !state.error} searchBarPlaceholder="Search by name...">
      <List.Section title={props.repo.name + " - Pipelines"} subtitle={state.pipelines?.length + ""}>
        {state.pipelines?.map((pipeline) => (
          <SearchListItem key={pipeline.uuid} pipeline={pipeline} repoSlug={props.repo.slug} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ pipeline, repoSlug }: { pipeline: Pipeline, repoSlug: string }): JSX.Element {
  const { pipeline: pipeIcon } = icon;
  const statusIconUrl = pipeline.state == "SUCCESSFUL" ? pipeIcon.success
    : (pipeline.state == "HALTED" || pipeline.state == "PAUSED") ? pipeIcon.paused
      : pipeline.state == "IN_PROGRESS" ? pipeIcon.progress
        : pipeline.state == "STOPPED" ? pipeIcon.stopped
          : pipeline.state == "FAILED" ? pipeIcon.failed
            : ''

  const pipelineImg = pipeline.avatarCreatorUrl ? pipeline.avatarCreatorUrl
    : (pipeline.triggerName == "SCHEDULE") ? 'icon-calendar.png'
      : 'icon-user.png'

  return (
    <List.Item
      title={pipeline.uuid}
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
              icon={{ source: "icon-code.png", tintColor: Color.PrimaryText }}
            />
          </ActionPanel.Section>
          {/* <DeleteAnnotationAction annotation={searchResult} /> */}
        </ActionPanel>
      }
    />
  );
}
