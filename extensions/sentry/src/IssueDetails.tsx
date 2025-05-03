import { Detail, Icon } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Actions } from "./Actions";
import { useIssueDetails, useLatestEvent } from "./sentry";
import { Breadcrumb, Breadcrumbs, Event, Exception, Issue, Organization, Tag } from "./types";
import { getFormattedEventsCount, getFormattedAffectedUsersCount, getAssigneeIcon } from "./utils";

const timeFormatter = new Intl.DateTimeFormat("en-US", { timeStyle: "medium" });

function formatBreadcrumb(breadcrumb: Breadcrumb) {
  switch (breadcrumb.type) {
    case "default":
      return `- **${timeFormatter.format(new Date(breadcrumb.timestamp))}:** ${breadcrumb.message} _(${JSON.stringify(
        breadcrumb.data
      )})_`;
    case "http":
      return `- **${timeFormatter.format(new Date(breadcrumb.timestamp))}:** ${breadcrumb.data.method} ${JSON.stringify(
        breadcrumb.data
      )} _(${breadcrumb.data.status_code})_`;
    case "debug":
      return `- **${timeFormatter.format(new Date(breadcrumb.timestamp))}:** ${breadcrumb.message} ${JSON.stringify(
        breadcrumb.data
      )} _(${breadcrumb.category})_`;
    case "info":
      return `- **${timeFormatter.format(new Date(breadcrumb.timestamp))}:** ${breadcrumb.message} ${JSON.stringify(
        breadcrumb.data
      )} _(${breadcrumb.category})_`;
    case "error":
      return `- **${timeFormatter.format(new Date(breadcrumb.timestamp))}:** ${breadcrumb.message} ${JSON.stringify(
        breadcrumb.data
      )} _(${breadcrumb.category})_`;
    default:
      console.debug("Unknown breadcrumb type", breadcrumb);
      return "";
  }
}

function formatBreadcrumbs(lastEvent?: Event) {
  if (!lastEvent) {
    return "";
  }

  const formattedBreadcrumbs = lastEvent.entries
    .filter((entry) => entry.type === "breadcrumbs")
    .flatMap((entry) => (entry as Breadcrumbs).data.values)
    .sort((a, b) => Number(new Date(b.timestamp)) - Number(new Date(a.timestamp)))
    .map((breadcrumb) => formatBreadcrumb(breadcrumb))
    .join("\n");

  return `## Breadcrumbs\n${formattedBreadcrumbs}`;
}

function formatLastEvent(lastEvent?: Event) {
  if (!lastEvent) {
    return "";
  }

  let markdown = "## Last Event\n";

  if (lastEvent.user) {
    markdown += `### User\n\n`;
    markdown += `- **ID**: ${lastEvent.user.id}\n`;
    markdown += `- **IP Address:** ${lastEvent.user.ip_address}\n\n`;
  }

  if (lastEvent.contexts.app) {
    markdown += `### App\n\n`;
    markdown += `- **Build ID**: ${lastEvent.contexts.app.app_identifier}\n`;
    markdown += `- **Build Name**: ${lastEvent.contexts.app.app_name}\n`;
    markdown += `- **Version**: ${lastEvent.contexts.app.app_version}\n\n`;
  }

  if (lastEvent.contexts.device) {
    markdown += `### Device\n\n`;
    markdown += `- **Family**: ${lastEvent.contexts.device.family}\n`;
    markdown += `- **Model**: ${lastEvent.contexts.device.model}\n\n`;
  }

  if (lastEvent.contexts.os) {
    markdown += `### Operating System\n\n`;
    markdown += `- **Name**: ${lastEvent.contexts.os.name}\n`;
    markdown += `- **Version**: ${lastEvent.contexts.os.version} (${lastEvent.contexts.os.build})\n\n`;
  }

  if (lastEvent.sdk) {
    markdown += `### SDK\n\n`;
    markdown += `- **Name** ${lastEvent.sdk.name}\n`;
    markdown += `- **Version** ${lastEvent.sdk.version}\n\n`;
  }

  return markdown;
}

function formatException(lastEvent?: Event) {
  if (!lastEvent) {
    return "";
  }

  const exception = lastEvent.entries.find((entry) => entry.type === "threads") as Exception | undefined;
  if (!exception) {
    return "";
  }

  const lastException = exception.data.values?.[0];
  if (!lastException) {
    return "";
  }

  const fomattedException = lastException.stacktrace.frames
    .filter((frame) => frame.inApp)
    .map((frame) => `- ${frame.function} _(${frame.filename}:${frame.lineNo})_`)
    .reverse()
    .join("\n");

  return `\n## Exception\n${fomattedException}`;
}

export type IssueDetailsProps = {
  issue: Issue;
  organization?: Organization;
  mutateList?: MutatePromise<Issue[]>;
};

export function IssueDetails(props: IssueDetailsProps) {
  const { data: latestEvent, isLoading: isLoadingLatestEvent } = useLatestEvent(props.issue);
  const { data: issue, isLoading: isLoadingIssueDetails, mutate } = useIssueDetails(props.issue);

  const markdown = `# ${props.issue.title}\n${formatException(latestEvent)}\n${formatLastEvent(
    latestEvent
  )}\n${formatBreadcrumbs(latestEvent)}`;

  return (
    <Detail
      navigationTitle={props.issue.shortId}
      isLoading={isLoadingLatestEvent || isLoadingIssueDetails}
      markdown={markdown}
      metadata={<IssueMetadata issue={issue} lastEvent={latestEvent} />}
      actions={
        <Actions
          issue={props.issue}
          organization={props.organization}
          mutateList={props.mutateList}
          mutateDetail={mutate}
          isDetail
        />
      }
    />
  );
}

function IssueMetadata(props: { issue?: Issue; lastEvent?: Event }) {
  return (
    <Detail.Metadata>
      {props.issue && (
        <Detail.Metadata.Label icon={Icon.ArrowClockwise} title="Events" text={getFormattedEventsCount(props.issue)} />
      )}
      {props.issue && (
        <Detail.Metadata.Label icon={Icon.Person} title="Users" text={getFormattedAffectedUsersCount(props.issue)} />
      )}
      {props.issue && (
        <Detail.Metadata.Label
          icon={Icon.Clock}
          title="Last Seen"
          text={new Date(props.issue.lastSeen).toLocaleString()}
        />
      )}
      {props.issue && (
        <Detail.Metadata.Label
          icon={getAssigneeIcon(props.issue)}
          title="Assignee"
          text={props.issue.assignedTo?.name ?? "Unassigned"}
        />
      )}
      <Detail.Metadata.Separator />
      <EventTagList tags={props.lastEvent?.tags ?? []} />
    </Detail.Metadata>
  );
}

function EventTagList(props: { tags: Tag[] }) {
  return (
    <>{props.tags.map((tag) => tag.key && <Detail.Metadata.Label key={tag.key} title={tag.key} text={tag.value} />)}</>
  );
}
