import { Color, Detail, Icon, Image, List } from "@raycast/api";
import { MergeRequest, User } from "../gitlabapi";
import { capitalizeFirstLetter, formatDate } from "../utils";
import { getMRStateListIcon } from "./mr_status";
import { userIcon, userTagOnAction } from "./users";

const authorAssigneeMergedTitle = "Author & Assignee";

function isAuthorOnlyAssignee(mr: MergeRequest): boolean {
  return mr.author !== undefined && mr.assignees.length === 1 && mr.assignees[0].id === mr.author.id;
}

function mergeOptionItems(mr: MergeRequest): string[] {
  const items: string[] = [];
  if (mr.force_remove_source_branch === true) {
    items.push("Delete after Merge");
  }
  if (mr.squash_on_merge === true) {
    items.push("Squash before Merge");
  }
  if (mr.merge_when_pipeline_succeeds === true) {
    items.push("Auto Merge");
  }
  return items;
}

function UserDetailTagList(props: { title: string; users: User[] }) {
  if (props.users.length <= 0) {
    return null;
  }
  return (
    <Detail.Metadata.TagList title={props.title}>
      {props.users.map((user) => (
        <Detail.Metadata.TagList.Item
          key={user.id}
          text={user.name}
          icon={userIcon(user)}
          onAction={userTagOnAction(user)}
        />
      ))}
    </Detail.Metadata.TagList>
  );
}

function AuthorDetailMetadata({ mr }: { mr: MergeRequest }) {
  if (!mr.author) {
    return null;
  }
  return (
    <Detail.Metadata.TagList title={isAuthorOnlyAssignee(mr) ? authorAssigneeMergedTitle : "Author"}>
      <Detail.Metadata.TagList.Item
        text={mr.author.name}
        icon={userIcon(mr.author)}
        onAction={userTagOnAction(mr.author)}
      />
    </Detail.Metadata.TagList>
  );
}

function AuthorListDetailMetadata({ mr }: { mr: MergeRequest }) {
  if (!mr.author) {
    return null;
  }
  return (
    <List.Item.Detail.Metadata.TagList title={isAuthorOnlyAssignee(mr) ? authorAssigneeMergedTitle : "Author"}>
      <List.Item.Detail.Metadata.TagList.Item
        text={mr.author.name}
        icon={userIcon(mr.author)}
        onAction={userTagOnAction(mr.author)}
      />
    </List.Item.Detail.Metadata.TagList>
  );
}

function assigneesForPeopleSection(mr: MergeRequest): User[] {
  if (isAuthorOnlyAssignee(mr)) {
    return [];
  }
  return mr.assignees;
}

function UserListDetailTagList(props: { title: string; users: User[] }) {
  if (props.users.length <= 0) {
    return null;
  }
  return (
    <List.Item.Detail.Metadata.TagList title={props.title}>
      {props.users.map((user) => (
        <List.Item.Detail.Metadata.TagList.Item
          key={user.id}
          text={user.name}
          icon={userIcon(user)}
          onAction={userTagOnAction(user)}
        />
      ))}
    </List.Item.Detail.Metadata.TagList>
  );
}

function DetailMergeOptions({ mr }: { mr: MergeRequest }) {
  const options = mergeOptionItems(mr);
  if (options.length <= 0) {
    return null;
  }
  return (
    <Detail.Metadata.TagList title="Merge Options">
      {options.map((text) => (
        <Detail.Metadata.TagList.Item key={text} text={text} />
      ))}
    </Detail.Metadata.TagList>
  );
}

function ListDetailMergeOptions({ mr }: { mr: MergeRequest }) {
  const options = mergeOptionItems(mr);
  if (options.length <= 0) {
    return null;
  }
  return (
    <List.Item.Detail.Metadata.TagList title="Merge Options">
      {options.map((text) => (
        <List.Item.Detail.Metadata.TagList.Item key={text} text={text} />
      ))}
    </List.Item.Detail.Metadata.TagList>
  );
}

function MRDateLabel(props: {
  title: string;
  isoDate: string;
  Label: typeof Detail.Metadata.Label | typeof List.Item.Detail.Metadata.Label;
}) {
  const Label = props.Label;
  return <Label title={props.title} text={formatDate(props.isoDate)} />;
}

function MRDateLabels(props: {
  mr: MergeRequest;
  Label: typeof Detail.Metadata.Label | typeof List.Item.Detail.Metadata.Label;
}) {
  return (
    <>
      {props.mr.created_at && <MRDateLabel title="Created" isoDate={props.mr.created_at} Label={props.Label} />}
      {props.mr.updated_at && <MRDateLabel title="Updated" isoDate={props.mr.updated_at} Label={props.Label} />}
      {props.mr.merged_at && <MRDateLabel title="Merged" isoDate={props.mr.merged_at} Label={props.Label} />}
      {props.mr.closed_at && <MRDateLabel title="Closed" isoDate={props.mr.closed_at} Label={props.Label} />}
    </>
  );
}

function DiscussionsMetadataLabel(props: {
  discussionLabel?: string;
  Label: typeof Detail.Metadata.Label | typeof List.Item.Detail.Metadata.Label;
}) {
  if (!props.discussionLabel) {
    return null;
  }
  const Label = props.Label;
  return (
    <Label
      title="Discussions"
      text={props.discussionLabel}
      icon={{ source: Icon.SpeechBubble, tintColor: Color.PrimaryText }}
    />
  );
}

function ApprovalsMetadataLabel(props: {
  approvalsCount?: number;
  Label: typeof Detail.Metadata.Label | typeof List.Item.Detail.Metadata.Label;
}) {
  if (!props.approvalsCount || props.approvalsCount <= 0) {
    return null;
  }
  const Label = props.Label;
  return (
    <Label
      title="Approvals"
      text={`${props.approvalsCount}`}
      icon={{ source: Icon.ThumbsUp, tintColor: Color.Green }}
    />
  );
}

export function MRDetailMetadata(props: { mr: MergeRequest; discussionLabel?: string }) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={capitalizeFirstLetter(props.mr.state)}
          color={props.mr.state === "closed" ? Color.Red : props.mr.state === "merged" ? Color.Purple : Color.Green}
          icon={(getMRStateListIcon(props.mr.state) as { value: Image.ImageLike }).value}
        />
      </Detail.Metadata.TagList>
      <AuthorDetailMetadata mr={props.mr} />
      {props.mr.labels.length > 0 && (
        <Detail.Metadata.TagList title="Labels">
          {props.mr.labels.map((label) => (
            <Detail.Metadata.TagList.Item key={label.id} text={label.name} color={label.color} />
          ))}
        </Detail.Metadata.TagList>
      )}
      {props.mr.milestone && <Detail.Metadata.Label title="Milestone" text={props.mr.milestone.title} />}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="From" text={props.mr.source_branch} />
      <Detail.Metadata.Label title="Into" text={props.mr.target_branch} />
      <Detail.Metadata.Separator />
      <UserDetailTagList
        title={assigneesForPeopleSection(props.mr).length === 1 ? "Assignee" : "Assignees"}
        users={assigneesForPeopleSection(props.mr)}
      />
      <DiscussionsMetadataLabel discussionLabel={props.discussionLabel} Label={Detail.Metadata.Label} />
      <ApprovalsMetadataLabel approvalsCount={props.mr.approvals_count} Label={Detail.Metadata.Label} />
      <UserDetailTagList
        title={props.mr.reviewers.length === 1 ? "Reviewer" : "Reviewers"}
        users={props.mr.reviewers}
      />
      <DetailMergeOptions mr={props.mr} />
      <Detail.Metadata.Separator />
      <MRDateLabels mr={props.mr} Label={Detail.Metadata.Label} />
    </Detail.Metadata>
  );
}

export function MRListDetailMetadata(props: { mr: MergeRequest; discussionLabel?: string }) {
  return (
    <List.Item.Detail.Metadata>
      <AuthorListDetailMetadata mr={props.mr} />
      {props.mr.labels.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Labels">
          {props.mr.labels.map((label) => (
            <List.Item.Detail.Metadata.TagList.Item key={label.id} text={label.name} color={label.color} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {props.mr.milestone && <List.Item.Detail.Metadata.Label title="Milestone" text={props.mr.milestone.title} />}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="From" text={props.mr.source_branch} />
      <List.Item.Detail.Metadata.Label title="Into" text={props.mr.target_branch} />
      <List.Item.Detail.Metadata.Separator />
      <UserListDetailTagList
        title={assigneesForPeopleSection(props.mr).length === 1 ? "Assignee" : "Assignees"}
        users={assigneesForPeopleSection(props.mr)}
      />
      <DiscussionsMetadataLabel discussionLabel={props.discussionLabel} Label={List.Item.Detail.Metadata.Label} />
      <ApprovalsMetadataLabel approvalsCount={props.mr.approvals_count} Label={List.Item.Detail.Metadata.Label} />
      <UserListDetailTagList
        title={props.mr.reviewers.length === 1 ? "Reviewer" : "Reviewers"}
        users={props.mr.reviewers}
      />
      <ListDetailMergeOptions mr={props.mr} />
      <List.Item.Detail.Metadata.Separator />
      <MRDateLabels mr={props.mr} Label={List.Item.Detail.Metadata.Label} />
    </List.Item.Detail.Metadata>
  );
}
