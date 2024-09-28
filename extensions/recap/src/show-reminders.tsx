import { ActionPanel, Detail, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import TurndownService from "turndown";
import fetch from "node-fetch";

interface Preferences {
  accessToken: string;
}

interface Reminder {
  $id: string;
  prompt: string;
  summary: string;
}

interface RemindersResponse {
  reminders: Reminder[];
}

export default function Command() {
  const turndownService = new TurndownService();

  const { accessToken } = getPreferenceValues<Preferences>();
  const { isLoading, data, revalidate } = useFetch<RemindersResponse>(
    "https://getrecapai.vercel.app/api/get-reminders",
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const parseSummary = (summaryString: string) => {
    try {
      return JSON.parse(summaryString);
    } catch (error) {
      const jsonMatch = summaryString.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (innerError) {
          console.error("Error parsing extracted JSON:", innerError);
        }
      }

      console.error("Error parsing summary:", error);
      return {
        category: "error",
        summary: "Couldn't parse summary. Please check the data format.",
      };
    }
  };

  const getIcon = (summaryString: string) => {
    const parsedSummary = parseSummary(summaryString);
    const category = parsedSummary.category;

    switch (category) {
      case "book":
        return Icon.Book;
      case "article":
        return Icon.Paragraph;
      case "video":
        return Icon.Video;
      case "audio":
        return Icon.Microphone;
      case "error":
        return Icon.Warning;
      default:
        return Icon.LightBulb;
    }
  };

  const getSummaryMarkdown = (summaryString: string) => {
    const parsedSummary = parseSummary(summaryString);
    const summaryContent = parsedSummary.summary || JSON.stringify(parsedSummary, null, 2);

    if (typeof summaryContent === "string" && summaryContent.includes("\n")) {
      return summaryContent;
    }

    return turndownService.turndown(summaryContent);
  };

  const handleDelete = async (id: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting reminder..." });

    try {
      const response = await fetch("https://getrecapai.vercel.app/api/delete-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Reminder deleted.";
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete reminder:";
      if (err instanceof Error) {
        toast.message = err.message;
      } else {
        toast.message = "An unknown error occurred";
      }
    }
  };

  return (
    <List isLoading={isLoading}>
      {data &&
        data.reminders &&
        data.reminders.length > 0 &&
        data.reminders.map((reminder: Reminder) => (
          <List.Item
            key={reminder.prompt}
            title={reminder.prompt}
            icon={getIcon(reminder.summary)}
            actions={
              <ActionPanel>
                <Action.Push title="Show Details" target={<Detail markdown={getSummaryMarkdown(reminder.summary)} />} />
                <ActionPanel.Section>
                  <DeleteReminderAction onDelete={() => handleDelete(reminder.$id)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function DeleteReminderAction(props: { onDelete: () => void }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Delete Reminder"
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={props.onDelete}
    />
  );
}
