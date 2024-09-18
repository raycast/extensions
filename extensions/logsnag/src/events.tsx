import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import React, { useState } from "react";
import { Log, Tag } from "./utils/types";
import { publishLog } from "./utils/api";
import ErrorComponent from "./components/ErrorComponent";
import { ALLOWED_LOG_TAG_KEY_REGEX_SCHEMA, DEFAULT_EMOJI } from "./utils/constants";

export default function Log() {
  const { push } = useNavigation();
  const [logs, setLogs] = useCachedState<Log[]>("logs", []);
  const [isLoading, setIsLoading] = useState(false);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  async function confirmAndRemove(log: Log, logIndex: number) {
    if (
      await confirmAlert({
        title: `Remove '${log.event}'?`,
        message: `This will NOT remove the log from your LogSnag Dashboard.`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const newLogs = logs;
      newLogs.splice(logIndex, 1);
      setLogs([...newLogs]);
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search event" isShowingDetail={isShowingDetail}>
      {logs.length === 0 ? (
        <List.EmptyView
          title="No events found"
          icon={"no-event.svg"}
          description="Publish an event to get started."
          actions={
            <ActionPanel>
              <Action
                title="Publish New Event"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                icon={Icon.Plus}
                onAction={() => push(<PublishLog onLogPublished={(log: Log) => setLogs([...logs, log])} />)}
              />
              <Action.OpenInBrowser title="View API Reference" url="https://docs.logsnag.com/endpoints/log" />
            </ActionPanel>
          }
        />
      ) : (
        !isLoading &&
        logs
          .sort((a, b) => new Date(b.timestamp || "").valueOf() - new Date(a.timestamp || "").valueOf())
          .map((log, logIndex) => (
            <List.Item
              title={log.event}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      { tag: log.project },
                      { tag: `#${log.channel}` },
                      { tag: log.timestamp ? new Date(log.timestamp) : undefined },
                    ]
              }
              key={logIndex}
              icon={log.icon || DEFAULT_EMOJI}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Details"
                    icon={Icon.AppWindowSidebarRight}
                    onAction={() => setIsShowingDetail(!isShowingDetail)}
                  />
                  <Action
                    title="Remove Event"
                    icon={Icon.Eraser}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    style={Action.Style.Destructive}
                    onAction={() => confirmAndRemove(log, logIndex)}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Publish New Event"
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      icon={Icon.Plus}
                      onAction={() => push(<PublishLog onLogPublished={(log) => setLogs([...logs, log])} />)}
                    />
                    <Action.OpenInBrowser title="View API Reference" url="https://docs.logsnag.com/endpoints/log" />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  markdown={log.description}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Project" text={log.project} />
                      <List.Item.Detail.Metadata.Label title="Channel" text={log.channel} />
                      <List.Item.Detail.Metadata.Label title="Event" text={log.event} />
                      <List.Item.Detail.Metadata.Label
                        title="Timestamp"
                        text={log.timestamp ? new Date(log.timestamp).toDateString() : undefined}
                        icon={!log.timestamp ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label title="Parser" text={log.parser} />
                      <List.Item.Detail.Metadata.Label
                        title="Description"
                        text={log.description}
                        icon={!log.description ? Icon.Minus : undefined}
                      />
                      <List.Item.Detail.Metadata.Label title="Icon" icon={log.icon || "🔔"} />
                      <List.Item.Detail.Metadata.Label title="Notify" icon={log.notify ? Icon.Check : Icon.Multiply} />
                      <List.Item.Detail.Metadata.Separator />
                      {log.tags ? (
                        <List.Item.Detail.Metadata.TagList title="Tags">
                          {Object.entries(log.tags).map(([key, val], index) => (
                            <List.Item.Detail.Metadata.TagList.Item key={index} text={`${key}: ${val.toString()}`} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Tags" icon={Icon.Minus} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))
      )}
    </List>
  );
}

type PublishLogProps = {
  onLogPublished: (log: Log) => void;
};
export function PublishLog({ onLogPublished }: PublishLogProps) {
  const { push, pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const [parser, setParser] = useState("text");

  type FormTag = {
    name: string;
    value: string;
    nameError: string;
    valueError: string;
  };
  const [formTags, setFormTags] = useState<FormTag[]>([]);

  const { handleSubmit, itemProps } = useForm<Log>({
    async onSubmit(values) {
      setIsLoading(true);

      const { project, channel, event, timestamp, description, icon, notify, parser } = values;

      const logOptions: Log = { project, channel, event, notify, parser: parser === "markdown" ? "markdown" : "text" };

      if (timestamp) logOptions.timestamp = Math.floor(new Date(timestamp).getTime() / 1000);
      else logOptions.timestamp = Math.floor(new Date().getTime() / 1000);

      if (description) logOptions.description = description;
      if (icon) logOptions.icon = icon;

      const tags: Tag = {};
      if (formTags) {
        formTags.forEach((tag) => {
          tags[tag.name] = tag.value;
        });
        logOptions.tags = tags;
      }

      const response = await publishLog(logOptions);

      if (!("message" in response)) {
        showToast(Toast.Style.Success, "Logged Successfully");
        onLogPublished(response);
        pop();
      } else {
        push(<ErrorComponent errorResponse={response} />);
      }
      setIsLoading(false);
    },
    validation: {
      project: FormValidation.Required,
      channel: FormValidation.Required,
      event: FormValidation.Required,
    },
    initialValues: {
      notify: false,
    },
  });

  async function addTag() {
    if (formTags.length === 5)
      await showToast({
        title: "Error",
        message: "Can not have more than 5 tags",
        style: Toast.Style.Failure,
      });
    else {
      setFormTags([...formTags, { name: "", value: "", nameError: "", valueError: "" }]);
      await showToast({
        title: `Tag # ${formTags.length + 1} added`,
        message: `Total Tags: ${formTags.length + 1}`,
        style: Toast.Style.Success,
      });
    }
  }
  async function removeTag() {
    if (formTags.length !== 0) {
      setFormTags(formTags.slice(0, -1));
      await showToast({
        title: `Tag # ${formTags.length} removed`,
        message: `New Total Tags: ${formTags.length - 1}`,
        style: Toast.Style.Success,
      });
    }
  }
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
          <Action title="Add Tag" icon={Icon.Plus} onAction={addTag} shortcut={{ modifiers: ["cmd"], key: "t" }} />
          {formTags.length > 0 && (
            <Action
              title="Remove Tag"
              icon={Icon.Minus}
              onAction={removeTag}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.project}
        title="Project"
        info="Project name - make sure Project exists in LogSnag dashboard"
        placeholder="raycast"
      />
      <Form.TextField
        {...itemProps.channel}
        title="Channel"
        info="Channel name - make sure Channel exists in LogSnag dashboard"
        placeholder="api"
      />

      <Form.TextField {...itemProps.event} title="Event" info="Event name" placeholder="Event Published" />

      <Form.DatePicker
        id="timestamp"
        title="Historical"
        type={Form.DatePicker.Type.DateTime}
        info="Assign a different date and time to the event rather than being recorded as the current time."
      />

      <Form.Dropdown
        title="Parser"
        id="parser"
        onChange={setParser}
        info="The markdown parser makes it possible to style the description, making it easier to scan while scrolling through the timeline."
      >
        <Form.Dropdown.Item title="Text" value="text" />
        <Form.Dropdown.Item title="Markdown" value="markdown" />
      </Form.Dropdown>
      {parser === "markdown" && (
        <Form.Description
          title="Markdown"
          text={`Bold = **bold**
Italic = *italic*
Link = [link](https://logsnag.com)
Inline Code = \`code\`
Code Block = \`\`\`code\`\`\`
`}
        />
      )}
      <Form.TextArea
        {...itemProps.description}
        title="Description"
        info="Event description"
        placeholder={
          parser === "text"
            ? "API called from Raycast LogSnag extension"
            : "**API** called from [Raycast](https://raycast.com) LogSnag *extension*"
        }
      />

      <Form.TextField
        title="Icon"
        placeholder="🔔 | :bell:"
        {...itemProps.icon}
        info="Icon must be a single valid emoji"
      />
      <Form.Description text="EMOJI TIP: Enter ':' above to access Emoji Picker" />
      <Form.Separator />

      <Form.Checkbox {...itemProps.notify} title="Notify" label="Send push notification" storeValue />

      <Form.Separator />
      <Form.Description title="Tags" text="Press 'cmd+T' to add a Tag" />
      {formTags.length > 0 && <Form.Description text="Press 'cmd+shift+T' to remove a Tag" />}
      {formTags.map((tag, tagIndex) => (
        <React.Fragment key={tagIndex}>
          <Form.TextField
            key={`name_${tagIndex}`}
            id={`name_${tagIndex}`}
            placeholder={`Tag # ${tagIndex + 1}`}
            title={`Tag ${tagIndex + 1} Name`}
            info={`schema: ${ALLOWED_LOG_TAG_KEY_REGEX_SCHEMA}`}
            onChange={(newName) => {
              const newTags = formTags;
              newTags[tagIndex].name = newName;
              setFormTags([...newTags]);
            }}
            error={tag.nameError}
            onBlur={(event) => {
              const currentTags = formTags;
              if (!event.target.value) currentTags[tagIndex].nameError = "The item is required";
              else if (!ALLOWED_LOG_TAG_KEY_REGEX_SCHEMA.test(event.target.value))
                currentTags[tagIndex].nameError = "The item must be lowercase characters or dashes";
              else currentTags[tagIndex].nameError = "";
              setFormTags([...formTags]);
            }}
          />
          <Form.TextField
            key={`value_${tagIndex}`}
            id={`value_${tagIndex}`}
            placeholder={`Value # ${tagIndex + 1}`}
            title={`Tag ${tagIndex + 1} Value`}
            info="examples: 19 | john doe | false"
            onChange={(newValue) => {
              const newTags = formTags;
              newTags[tagIndex].value = newValue;
              setFormTags([...newTags]);
            }}
            error={tag.valueError}
            onBlur={(event) => {
              const currentTags = formTags;
              if (event.target.value?.length === 0) currentTags[tagIndex].valueError = "The item is required";
              else currentTags[tagIndex].valueError = "";
              setFormTags([...formTags]);
            }}
          />
        </React.Fragment>
      ))}
    </Form>
  );
}
