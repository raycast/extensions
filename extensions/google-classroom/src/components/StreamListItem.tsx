import { recordRender } from "../helpers/profiling";
import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { ReactNode } from "react";
import { Course, StreamItem, getStatus } from "../api/classroom";
import { withAuthUser } from "../api/googleAuth";
import { downloadAttachments, sendToAIChat } from "../helpers/actions";
import {
  STATUS_INFO,
  TYPE_INFO,
  escapeMarkdown,
  formatDateTime,
  formatGrade,
  formatRelative,
  getAttachmentUrl,
  getItemBody,
  getItemDetails,
  getStatusTitle,
} from "../helpers/formatters";

import RefreshAction from "./RefreshAction";

type StreamListItemProps = {
  onRefresh: () => void;
  showIcon?: boolean;
  // Without the detail view, the row itself tells the course, the status and the due date
  isShowingDetail?: boolean;
  // Shown with Refresh, after the actions of the post
  extraActions?: ReactNode;
  item: StreamItem;
  course: Course;
  topic?: string;
  // Action to go to the course, shown right after the primary action
  courseAction: ReactNode;
};

export default function StreamListItem({
  item,
  course,
  topic,
  courseAction,
  onRefresh,
  showIcon = true,
  isShowingDetail = true,
  extraActions,
}: StreamListItemProps) {
  const renderStarted = performance.now();
  const status = getStatus(item);
  const isCourseWork = item.type === "assignment" || item.type === "question";
  const dueDate = item.dueDate ? new Date(item.dueDate) : undefined;
  const grade = formatGrade(item);
  const creator = course.teachers?.find((teacher) => teacher.userId === item.creatorUserId);
  const hasDriveFiles = item.attachments.some((attachment) => attachment.driveId);
  const hasSubmittedFiles = item.submission?.attachments.some((attachment) => attachment.driveId);

  // What tells apart rows that share a title like "Assignment 1": when it's due, or that it's done
  const accessories: List.Item.Accessory[] = [];
  if (isCourseWork) {
    const { title, color, icon } = STATUS_INFO[status];
    if (!isShowingDetail) accessories.push({ tag: { value: getStatusTitle(item), color } });
    if (dueDate && (status === "assigned" || status === "missing")) {
      accessories.push({
        text: { value: formatRelative(dueDate), color: status === "missing" ? Color.Red : undefined },
        tooltip: `Due ${formatDateTime(dueDate)}`,
      });
    } else if (isShowingDetail && status !== "assigned") {
      accessories.push({ icon: { source: icon, tintColor: color }, tooltip: title });
    }
  }

  const detail = (
    <List.Item.Detail
      markdown={`# ${escapeMarkdown(item.title)}\n\n${getItemBody(item, { forAccount: true })}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={TYPE_INFO[item.type].title}
            icon={TYPE_INFO[item.type].icon}
          />
          <List.Item.Detail.Metadata.Label title="Course" text={course.name} />
          {topic && <List.Item.Detail.Metadata.Label title="Topic" text={topic} />}
          {isCourseWork && (
            <>
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item text={getStatusTitle(item)} color={STATUS_INFO[status].color} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label
                title="Due"
                text={dueDate ? `${formatDateTime(dueDate)} (${formatRelative(dueDate)})` : "No due date"}
              />
              {grade && (
                <List.Item.Detail.Metadata.Label
                  title={item.submission?.assignedGrade !== undefined ? "Grade" : "Points"}
                  text={grade}
                />
              )}
            </>
          )}
          <List.Item.Detail.Metadata.Separator />
          {creator && (
            <List.Item.Detail.Metadata.Label
              title="Posted By"
              text={creator.name}
              icon={creator.photoUrl ? { source: creator.photoUrl, mask: Image.Mask.Circle } : Icon.Person}
            />
          )}
          <List.Item.Detail.Metadata.Label title="Posted" text={formatDateTime(new Date(item.creationTime))} />
          {item.updateTime !== item.creationTime && (
            <List.Item.Detail.Metadata.Label title="Updated" text={formatDateTime(new Date(item.updateTime))} />
          )}
          {item.submission && (
            <List.Item.Detail.Metadata.Link
              title="Your Work"
              text="Open Submission"
              target={withAuthUser(item.submission.url)}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );

  return recordRender(
    "assignments",
    renderStarted,
    <List.Item
      id={`${item.courseId}-${item.type}-${item.id}`}
      title={item.title}
      subtitle={isShowingDetail ? undefined : course.name}
      accessories={accessories}
      icon={showIcon ? TYPE_INFO[item.type].icon : undefined}
      keywords={[course.name, TYPE_INFO[item.type].title, ...(topic ? [topic] : [])]}
      detail={detail}
      actions={
        <ActionPanel title={item.title}>
          <Action.OpenInBrowser title={`Open ${TYPE_INFO[item.type].title}`} url={withAuthUser(item.url)} />
          {courseAction}

          <ActionPanel.Section>
            <Action
              title={`Send ${TYPE_INFO[item.type].title} to AI Chat`}
              icon={Icon.Stars}
              shortcut={{
                macOS: { modifiers: ["ctrl", "cmd"], key: "a" },
                Windows: { modifiers: ["ctrl", "alt"], key: "a" },
              }}
              onAction={() => sendToAIChat(item, course, topic)}
            />
            {hasDriveFiles && (
              <Action
                title="Download Attachments"
                icon={Icon.Download}
                shortcut={{
                  macOS: { modifiers: ["shift", "cmd"], key: "d" },
                  Windows: { modifiers: ["shift", "ctrl"], key: "d" },
                }}
                onAction={() => downloadAttachments(item, course)}
              />
            )}
            {hasSubmittedFiles && (
              <Action
                title="Download Submission"
                icon={Icon.Download}
                shortcut={{
                  macOS: { modifiers: ["opt", "cmd"], key: "d" },
                  Windows: { modifiers: ["ctrl", "alt"], key: "d" },
                }}
                onAction={() => downloadAttachments(item, course, { submission: true })}
              />
            )}
            {item.attachments.length > 0 && (
              <ActionPanel.Submenu
                title="Open Attachment…"
                icon={Icon.Paperclip}
                shortcut={Keyboard.Shortcut.Common.Open}
              >
                {item.attachments.map((attachment, index) => (
                  <Action.OpenInBrowser key={index} title={attachment.title} url={getAttachmentUrl(attachment)} />
                ))}
              </ActionPanel.Submenu>
            )}
            {item.submission && (
              <Action.OpenInBrowser title="Open Your Work" icon={Icon.Person} url={withAuthUser(item.submission.url)} />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Details"
              content={getItemDetails(item, course, topic)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Link" content={item.url} shortcut={Keyboard.Shortcut.Common.CopyPath} />
            <Action.CopyToClipboard
              title="Copy Title"
              content={item.title}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <RefreshAction onRefresh={onRefresh} />
            {extraActions}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />,
  );
}
