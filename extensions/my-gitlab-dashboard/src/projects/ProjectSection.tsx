import { List } from "@raycast/api";
import { PipelineOverview } from "../pipelines/PipelineOverview";
import dayjs from "dayjs";
import { MergeRequest } from "../gitlab/mergeRequest";
import { Pipeline } from "../gitlab/pipeline";
import MergeRequestItem from "../mergeRequests/MergeRequestItem";

export function ProjectSection(props: {
  projectId: string;
  projectName: string;
  mrs: MergeRequest[];
  latestPipeline?: Pipeline;
}) {
  return (
    <List.Section key={props.projectId} title={props.projectName} subtitle={projectSummary(props.mrs)}>
      {props.latestPipeline ? <PipelineOverview pipeline={props.latestPipeline} /> : null}
      {props.mrs.toSorted(prioritize).map((mr) => (
        <MergeRequestItem key={mr.id} mr={mr} />
      ))}
    </List.Section>
  );
}

function prioritize(mr1: MergeRequest, mr2: MergeRequest): number {
  const [mr1First, whoCares, mr2First] = [-1, 0, 1];
  const openedFirst = () => (mr1.state === "opened" ? mr1First : mr2First);
  const oldestCreatedFirst = () => (dayjs(mr1.createdAt).isBefore(dayjs(mr2.createdAt)) ? mr1First : mr2First);
  const newestUpdatedFirst = () => (dayjs(mr1.updatedAt).isAfter(dayjs(mr2.updatedAt)) ? mr1First : mr2First);
  const mineLast = () => (mr1.author.isMe ? mr2First : mr2.author.isMe ? mr1First : whoCares);
  const isMineWithApprovesOrComments = (mr: MergeRequest) =>
    mr.author.isMe && (mr.hasApprovers || mr.unresolvedCommentsCount > 0);

  if (mr1.state !== mr2.state) {
    return openedFirst();
  }
  if (mr1.state === "merged") {
    return newestUpdatedFirst();
  }
  // from this point onwards both are opened
  if (isMineWithApprovesOrComments(mr1) || mr1.hasUpdates) {
    return mr1First;
  }
  if (isMineWithApprovesOrComments(mr2) || mr2.hasUpdates) {
    return mr2First;
  }
  if (mr1.author.username !== mr2.author.username) {
    return mineLast();
  }
  return oldestCreatedFirst();
}

function projectSummary(mrs: MergeRequest[]): string {
  const openedCount = mrs.filter((mr) => mr.state == "opened").length;
  const mergedCount = mrs.filter((mr) => mr.state == "merged").length;
  const report = [];
  if (openedCount > 0) {
    report.push(`${openedCount} opened`);
  }
  if (mergedCount > 0) {
    report.push(`${mergedCount} merged`);
  }
  return report.join(", ");
}
