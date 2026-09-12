import { List } from "@raycast/api";
import { PipelineFragment } from "../generated/graphql";
import { PipelineListItem } from "./PipelineListItem";

export interface PipelineListSectionProps {
  pipelines: PipelineFragment[];
  title: string;
}

export function PipelineListSection({ pipelines, title }: PipelineListSectionProps) {
  return (
    <List.Section title={title}>
      {pipelines.map((node) => (
        <PipelineListItem key={node.slug} pipeline={node} />
      ))}
    </List.Section>
  );
}
