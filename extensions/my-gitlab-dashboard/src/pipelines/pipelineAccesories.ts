import { Color, getPreferenceValues } from "@raycast/api";
import { relativeDateAccessory } from "../utils";
import { Pipeline } from "../gitlab/pipeline";

interface Preferences {
  colorizedDatesForPipelines?: boolean;
}
const preferences = getPreferenceValues<Preferences>();

export const pipelineAccessoryFactories = {
  failedJobs: (pipeline: Pipeline) => {
    if (pipeline.hasFailedJobs) {
      const failed_job = pipeline.failedJobs[0];
      return {
        text: {
          value: `${failed_job.stage}:${failed_job.name}`,
          color: Color.Red,
        },
      };
    }
  },

  runningJobs: (pipeline: Pipeline) => {
    if (pipeline.hasRunningJobs) {
      const running_job = pipeline.runningJobs[0];
      return {
        text: {
          value: `${running_job.stage}:${running_job.name}`,
          color: Color.Blue,
        },
      };
    }
  },

  updatedAt: (pipeline: Pipeline) => {
    return relativeDateAccessory(pipeline.updatedAt, "Last run", preferences.colorizedDatesForPipelines);
  },
};
