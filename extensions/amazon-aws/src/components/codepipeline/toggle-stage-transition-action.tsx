import { Action, ActionPanel, captureException, Color, Icon, showToast, Toast } from "@raycast/api";
import {
  CodePipelineClient,
  DisableStageTransitionCommand,
  EnableStageTransitionCommand,
  StageState,
  StageTransitionType,
} from "@aws-sdk/client-codepipeline";
import { getErrorMessage } from "../../util";

export const ToggleStageTransitionAction = ({
  pipelineName,
  isLoading,
  revalidatePipeline,
  stages,
}: {
  pipelineName: string;
  isLoading: boolean;
  revalidatePipeline: () => void;
  stages?: (StageState & { nextStage?: StageState })[];
}) => {
  return (
    <ActionPanel.Submenu
      title="Toggle Stage Transition"
      icon={Icon.Bolt}
      shortcut={{ modifiers: ["ctrl"], key: "t" }}
      isLoading={isLoading}
      filtering
    >
      {(stages ?? [])
        .filter((s) => !!s.nextStage)
        .map((s) => {
          const transitionEnabled = !!s.nextStage!.inboundTransitionState?.enabled;
          return (
            <Action
              key={`${pipelineName}-${s.stageName}-${s.nextStage!.stageName}`}
              icon={
                transitionEnabled
                  ? { source: Icon.Bolt, tintColor: Color.Green }
                  : { source: Icon.BoltDisabled, tintColor: Color.Red }
              }
              title={`${s.stageName} -> ${s.nextStage!.stageName}`}
              onAction={async () => toggleStageTransition(transitionEnabled, pipelineName, s, revalidatePipeline)}
            />
          );
        })}
    </ActionPanel.Submenu>
  );
};

const toggleStageTransition = async (
  transitionEnabled: boolean,
  pipelineName: string,
  s: { stageName?: string; nextStage?: { stageName?: string } },
  revalidatePipeline: () => void,
) => {
  if (transitionEnabled) {
    const toast = await showToast(
      Toast.Style.Animated,
      "❗Disabling transition",
      `between ${s.stageName} -> ${s.nextStage!.stageName}`,
    );
    new CodePipelineClient({})
      .send(
        new DisableStageTransitionCommand({
          pipelineName,
          stageName: s.nextStage!.stageName,
          transitionType: StageTransitionType.Inbound,
          reason: "Disabled by Raycast",
        }),
      )
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "✅ Disabled transition";
      })
      .catch((err) => {
        captureException(err);
        toast.style = Toast.Style.Failure;
        toast.title = "❌ Failed to disable transition";
        toast.message = getErrorMessage(err);
      })
      .finally(revalidatePipeline);
  } else {
    const toast = await showToast(
      Toast.Style.Animated,
      "❗Enabling transition",
      `between ${s.stageName} -> ${s.nextStage!.stageName}`,
    );
    new CodePipelineClient({})
      .send(
        new EnableStageTransitionCommand({
          pipelineName,
          stageName: s.nextStage!.stageName,
          transitionType: StageTransitionType.Inbound,
        }),
      )
      .then(() => {
        toast.style = Toast.Style.Success;
        toast.title = "✅ Enabled transition";
      })
      .catch((err) => {
        captureException(err);
        toast.style = Toast.Style.Failure;
        toast.title = "❌ Failed to enable transition";
        toast.message = getErrorMessage(err);
      })
      .finally(revalidatePipeline);
  }
};
