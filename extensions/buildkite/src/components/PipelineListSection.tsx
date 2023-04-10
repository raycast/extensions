import { List } from "@raycast/api";
import { Pager } from "../utils/types";
import { Pipeline, PipelineListItem } from "./PipelineListItem";

export interface PipelineListSectionProps {
  pipelines: Pager<Pipeline>["edges"];
  title: string;
}

export function PipelineListSection({ pipelines, title }: PipelineListSectionProps) {
  return (
    <List.Section title={title}>
      {pipelines.map(({ node }) => (
        <PipelineListItem key={node.slug} pipeline={node} />
      ))}
    </List.Section>
  );
}
