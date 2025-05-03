import { ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { getGMailMessageHeaderValue } from "../../lib/gmail";
import {
  convertToSemanticLabels,
  generateLabelFilter,
  getAddressParts,
  getLabelDetailsFromIds,
  getLabelIcon,
  getLabelName,
  getMessageFileAttachmentNames,
  getMessageInternalDate,
  isMailUnread,
} from "./utils";
import { gmail_v1 } from "@googleapis/gmail";
import { getAvatarIcon } from "@raycast/utils";
import {
  MessageMarkAsReadAction,
  MessageMarkAsUnreadAction,
  MessagesRefreshAction,
  MessageCopyIdAction,
  MessageOpenInBrowserAction,
  MessageDeleteAction,
  MessageMarkAllAsReadAction,
  MessageShowDetailsAction,
  MessageDebugActionPanelSection,
  FilterActionPanelSection,
  CreateQueryQuickLinkAction,
  MessageMarkAsArchived,
  FilterMessagesLikeGivenAction,
  MessageCopyWebUrlAction,
} from "./actions";
import { getFirstValidLetter } from "../../lib/utils";
import { useContext } from "react";
import { GMailContext } from "../context";
import { ListSelectionController } from "../selection/utils";
import { SelectionActionSection } from "../selection/actions";

export function GMailMessageListItem(props: {
  message: gmail_v1.Schema$Message;
  onRevalidate?: () => void;
  showUnreadAccessory?: boolean;
  detailsShown?: boolean;
  onDetailsShownChanged?: (newValue: boolean) => void;
  allUnreadMessages?: gmail_v1.Schema$Message[];
  searchText?: string;
  setSearchText?: (newValue: string) => void;
  selectionController?: ListSelectionController<gmail_v1.Schema$Message>;
  query?: string;
}) {
  const data = props.message;
  const subject = () => {
    const subject = getGMailMessageHeaderValue(data, "Subject");
    if (subject) {
      return subject;
    }
    return "<No Subject>";
  };
  const labelsAll = useContext(GMailContext);
  const unread = isMailUnread(data);
  const unreadIcon = (): Image.ImageLike | undefined => {
    if (!data || props.showUnreadAccessory === false) {
      return;
    }
    const src = unread === true ? "envelope-closed.svg" : undefined;
    if (!src) {
      return;
    }
    return { source: Icon.Stars, tintColor: Color.Yellow };
  };

  const from = getGMailMessageHeaderValue(data, "From");
  const fromParts = getAddressParts(from);
  const to = getGMailMessageHeaderValue(data, "To");
  const toRecipients = to?.split(",");
  const icon = () => {
    if (props.selectionController && props.selectionController.isSelected(props.message)) {
      return Icon.CheckCircle;
    }
    const textIcon = getAvatarIcon(getFirstValidLetter(from, "?") || "");
    if (textIcon) {
      return textIcon;
    }
    return Icon.Envelope;
  };
  const labels = getLabelDetailsFromIds(data.labelIds, labelsAll);

  const internalDate = getMessageInternalDate(data);
  const detail = [`# ${subject()}`, internalDate?.toLocaleString(), data.snippet]
    .filter((e) => e && e.length > 0)
    .join("\n\n");
  const fileAttachments = getMessageFileAttachmentNames(data);
  return (
    <List.Item
      title={{ value: subject() || "", tooltip: props.detailsShown ? undefined : data.snippet }}
      subtitle={{
        value: fromParts && !props.detailsShown ? fromParts.name || fromParts.email : undefined,
        tooltip: fromParts && !props.detailsShown ? fromParts.email : undefined,
      }}
      icon={{ value: data ? icon() : undefined, tooltip: fromParts?.name || fromParts?.email || "" }}
      detail={
        <List.Item.Detail
          markdown={detail}
          metadata={
            <List.Item.Detail.Metadata>
              {internalDate && (
                <List.Item.Detail.Metadata.Label
                  title="Received"
                  text={internalDate?.toLocaleString()}
                  icon={Icon.Clock}
                />
              )}
              {fromParts?.name && (
                <List.Item.Detail.Metadata.Label title="From Name" text={fromParts.name} icon={Icon.Person} />
              )}
              {fromParts?.email && (
                <List.Item.Detail.Metadata.Label title="From Address" text={fromParts.email} icon={Icon.Envelope} />
              )}
              <List.Item.Detail.Metadata.TagList title="To">
                {toRecipients?.map((r) => (
                  <List.Item.Detail.Metadata.TagList.Item text={r} icon={getAvatarIcon(getFirstValidLetter(r) || "")} />
                ))}
              </List.Item.Detail.Metadata.TagList>
              {labels && labels.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Labels">
                  {labels?.map((l) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={l.id}
                      text={l.name || "?"}
                      color={l.color?.backgroundColor}
                      icon={Icon.Paperclip}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
              {fileAttachments && fileAttachments.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Attachments">
                  {fileAttachments?.map((a) => (
                    <List.Item.Detail.Metadata.TagList.Item key={a} text={a} icon={Icon.Paperclip} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      accessories={[
        { icon: unreadIcon(), tooltip: unreadIcon() ? "Unread" : undefined },
        {
          icon: fileAttachments && fileAttachments.length > 0 ? Icon.Paperclip : undefined,
          text: fileAttachments && fileAttachments.length > 0 ? fileAttachments.length.toString() : undefined,
          tooltip: fileAttachments && fileAttachments.length > 0 ? `Attachments: ${fileAttachments.length}` : undefined,
        },
        {
          date: !props.detailsShown ? internalDate : undefined,
          tooltip: !props.detailsShown ? internalDate?.toLocaleString() : undefined,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <MessageOpenInBrowserAction message={data} onOpen={props.onRevalidate} />
            <MessageShowDetailsAction
              detailsShown={props.detailsShown === true ? true : false}
              onAction={props.onDetailsShownChanged}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <MessageMarkAsReadAction
              message={data}
              onRevalidate={props.onRevalidate}
              selectionController={props.selectionController}
            />
            <MessageMarkAllAsReadAction messages={props.allUnreadMessages} onRevalidate={props.onRevalidate} />
            <MessageMarkAsUnreadAction
              message={data}
              onRevalidate={props.onRevalidate}
              selectionController={props.selectionController}
            />
            <MessageMarkAsArchived message={data} onRevalidate={props.onRevalidate} />
          </ActionPanel.Section>
          <FilterActionPanelSection
            labelsAll={labelsAll}
            searchText={props.searchText}
            setSearchText={props.setSearchText}
          />
          <ActionPanel.Section>
            <MessageDeleteAction
              message={data}
              onRevalidate={props.onRevalidate}
              selectionController={props.selectionController}
            />
          </ActionPanel.Section>
          <SelectionActionSection message={props.message} selectionController={props.selectionController} />
          <ActionPanel.Section>
            <FilterMessagesLikeGivenAction email={fromParts?.email} setSearchText={props.setSearchText} />
            <MessagesRefreshAction onRevalidate={props.onRevalidate} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CreateQueryQuickLinkAction searchText={props.searchText} />
            <MessageCopyIdAction message={data} />
            <MessageCopyWebUrlAction message={data} />
          </ActionPanel.Section>
          <MessageDebugActionPanelSection message={data} query={props.query} />
        </ActionPanel>
      }
    />
  );
}

export function QueryListDropdown(props: {
  labels: gmail_v1.Schema$Label[] | undefined;
  setSearchText: (newValue: string) => void;
  hideLabelIDs?: string[];
  defaultName?: string;
  defaultValue?: string;
}) {
  const labels = props.labels;
  if (!labels || labels.length <= 0 || !props.setSearchText) {
    return null;
  }
  const handle = (newValue: string) => {
    props.setSearchText(newValue);
  };
  const filterLabels = (labelsAll: gmail_v1.Schema$Label[] | undefined) => {
    if (!props.hideLabelIDs || props.hideLabelIDs.length <= 0) {
      return labelsAll;
    }
    return labelsAll?.filter((l) => !props.hideLabelIDs?.includes(l.id || ""));
  };
  const semanticLabels = convertToSemanticLabels(filterLabels(labels));
  return (
    <List.Dropdown tooltip="Filter" onChange={handle}>
      <List.Dropdown.Section>
        <List.Dropdown.Item
          title={props.defaultName ? props.defaultName : "Default"}
          icon={Icon.Box}
          value={props.defaultValue || ""}
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="System">
        {semanticLabels.systemLabels?.map((l) => (
          <List.Dropdown.Item
            key={l.id}
            title={getLabelName(l) || "?"}
            icon={getLabelIcon(l)}
            value={generateLabelFilter(l)}
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Categories">
        {semanticLabels.categories?.map((l) => (
          <List.Dropdown.Item
            key={l.id}
            title={getLabelName(l) || "?"}
            icon={getLabelIcon(l)}
            value={generateLabelFilter(l)}
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Labels">
        {semanticLabels.userLabels?.map((l) => (
          <List.Dropdown.Item
            key={l.id}
            title={getLabelName(l) || "?"}
            icon={getLabelIcon(l)}
            value={generateLabelFilter(l)}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
