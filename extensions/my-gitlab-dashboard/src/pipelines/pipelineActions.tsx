import { Action, Color, Icon } from "@raycast/api";
import { Job, Pipeline } from "../gitlab/pipeline";

export const pipelineActionFactories = {
  browse: {
    openFailedJob: (pipeline: Pipeline) => {
      if (pipeline.hasFailedJobs) {
        return <JobAction job={pipeline.failedJobs[0]} />;
      }
    },

    openInBrowser: (pipeline: Pipeline) => {
      return <Action.OpenInBrowser url={pipeline.webUrl} title="Open in Browser" />;
    },
  },
};

function JobAction(props: { job: Job }) {
  return (
    <Action.OpenInBrowser
      url={props.job.web_url}
      icon={{ source: Icon.Globe, tintColor: Color.Red }}
      title="Open Failed Job"
    />
  );
}
