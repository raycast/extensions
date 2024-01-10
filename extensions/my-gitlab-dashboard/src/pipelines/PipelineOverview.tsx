import { ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { Pipeline } from "../gitlab/pipeline";
import { pipelineAccessoryFactories } from "./pipelineAccesories";
import { pipelineActionFactories } from "./pipelineActions";
import React from "react";

export function PipelineOverview(props: { pipeline: Pipeline }) {
  return (
    <List.Item
      title={{ value: props.pipeline.branchName, tooltip: `Pipeline is ${props.pipeline.status}` }}
      subtitle={{ value: props.pipeline.commit.title, tooltip: `Pipeline is ${props.pipeline.status}` }}
      icon={pipelineStatusIcon(props.pipeline)}
      accessories={pipelineAccesories(props.pipeline)}
      actions={<PipelineActions pipeline={props.pipeline} />}
    />
  );
}

function pipelineStatusIcon(pipeline: Pipeline): Image.ImageLike {
  switch (pipeline.status) {
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "running":
      return { source: Icon.CircleProgress25, tintColor: Color.Blue };
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "pending":
      return { source: Icon.Play, tintColor: Color.Blue };
    default:
      return { source: Icon.QuestionMarkCircle, tintColor: Color.PrimaryText };
  }
}

function pipelineAccesories(pipeline: Pipeline): List.Item.Accessory[] {
  return Object.entries(pipelineAccessoryFactories)
    .map(([_name, accessoryFactory]) => accessoryFactory(pipeline))
    .filter((accessory): accessory is List.Item.Accessory => !!accessory);
}

function PipelineActions(props: { pipeline: Pipeline }) {
  return (
    <ActionPanel title={props.pipeline.branchName}>
      {Object.entries(pipelineActionFactories).map(([sectionName, section]) => (
        <ActionPanel.Section key={sectionName}>
          {Object.entries(section).map(([actionName, actionFactory]) => {
            const action = actionFactory(props.pipeline);
            if (action) {
              return React.cloneElement(action, { key: actionName });
            }
          })}
        </ActionPanel.Section>
      ))}
    </ActionPanel>
  );
}
