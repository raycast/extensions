import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  open,
  showToast,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getFrontmostAppContext,
  formatTitleWithEmoji,
} from "./lib/frontmost-app";
import { buildThingsUrl } from "./lib/things-url";
import { CapturedContext, ThingsTaskParams, Preferences } from "./lib/types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [context, setContext] = useState<CapturedContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [when, setWhen] = useState<string>(preferences.defaultList);
  const [project, setProject] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    async function loadContext() {
      try {
        const ctx = await getFrontmostAppContext();

        if (!ctx.title) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No context to capture",
          });
          popToRoot();
          return;
        }

        setContext(ctx);
        const formattedTitle = formatTitleWithEmoji(ctx);
        if (preferences.urlInNotes === "notes") {
          setTitle(formattedTitle);
          setNotes(ctx.url || "");
        } else {
          setTitle(ctx.url ? `${formattedTitle} - ${ctx.url}` : formattedTitle);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to get app context",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadContext();
  }, []);

  async function handleSubmit() {
    const url = buildThingsUrl({
      title,
      notes: notes || undefined,
      when: when === "inbox" ? undefined : (when as ThingsTaskParams["when"]),
      list: project || undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
      showQuickEntry: preferences.showQuickEntry,
    });
    try {
      await open(url);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Things",
        message: title,
      });
      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: String(error),
      });
    }
  }

  async function handleQuickAdd(targetWhen?: ThingsTaskParams["when"]) {
    const url = buildThingsUrl({
      title,
      notes: notes || undefined,
      when: targetWhen,
      list: project || undefined,
      tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
      showQuickEntry: false,
    });
    try {
      await open(url);
      await showToast({
        style: Toast.Style.Success,
        title: `Added to ${targetWhen || "Inbox"}`,
        message: title,
      });
      await closeMainWindow();
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add task",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add to Things"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <ActionPanel.Section title="Quick Add">
            <Action
              title="Add to Inbox"
              icon={Icon.Tray}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={() => handleQuickAdd(undefined)}
            />
            <Action
              title="Add to Today"
              icon={Icon.Calendar}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => handleQuickAdd("today")}
            />
            <Action
              title="Add to Evening"
              icon={Icon.Moon}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => handleQuickAdd("evening")}
            />
            <Action
              title="Add to Someday"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => handleQuickAdd("someday")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Source"
        text={context ? `${context.appName} (${context.type})` : "Loading..."}
      />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Task title"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Additional notes or URL"
        value={notes}
        onChange={setNotes}
        enableMarkdown
      />
      <Form.Dropdown id="when" title="When" value={when} onChange={setWhen}>
        <Form.Dropdown.Item value="inbox" title="Inbox" icon={Icon.Tray} />
        <Form.Dropdown.Item value="today" title="Today" icon={Icon.Calendar} />
        <Form.Dropdown.Item
          value="evening"
          title="This Evening"
          icon={Icon.Moon}
        />
        <Form.Dropdown.Item value="tomorrow" title="Tomorrow" icon={Icon.Sun} />
        <Form.Dropdown.Item value="someday" title="Someday" icon={Icon.Clock} />
      </Form.Dropdown>
      <Form.TextField
        id="project"
        title="Project"
        placeholder="Project or Area name"
        value={project}
        onChange={setProject}
        info="Leave empty for Inbox"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="tag1, tag2, tag3"
        value={tags}
        onChange={setTags}
        info="Comma-separated list of tags"
      />
    </Form>
  );
}
