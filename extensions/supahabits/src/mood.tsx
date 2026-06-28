import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  List,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import { useFetch } from "@raycast/utils";
import { Mood } from "./models/mood";

const moods = [
  { value: "excited", label: "Excited", Icon: "🚀" },
  { value: "good", label: "Good", Icon: "😊" },
  { value: "meh", label: "Meh", Icon: "😑" },
  { value: "bad", label: "Bad", Icon: "☹️" },
  { value: "awful", label: "Awful", Icon: "😭" },
];

export default function MoodCommand() {
  const [todayMood, setTodayMood] = useState<string>("good");
  const { secret } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  const { isLoading, data } = useFetch(`https://www.supahabits.com/api/mood-secret?secret=${secret}`, {
    parseResponse: async (response) => {
      return (await response.json()) as Mood[];
    },
    onError: async (error) => {
      if (error.message.indexOf("Unauthorized") !== -1) {
        await showHUD("⛔ Unauthorized, Please set your secret in the extension preferences");
        await openExtensionPreferences();
      }
    },
  });

  const submitMood = async (values: { mood: string; content: string }) => {
    try {
      await fetch(`https://www.supahabits.com/api/mood-secret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, mood: values.mood, content: values.content }),
      });
      showToast({ style: Toast.Style.Success, title: "✅ Mood submitted!" });

      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to submit mood" });
    }
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (data && data.length > 0) {
    return (
      <Detail
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Your Mood Track" url="https://www.supahabits.com/dashboard/mood" />
          </ActionPanel>
        }
        markdown={`### Your today mood\n\n${data[0].mood} - ${data[0].note}\n\n_Registered on ${new Date(data[0].created_at).toLocaleString()}._`}
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Mood" onSubmit={submitMood} />
          <Action.OpenInBrowser title="View Your Mood Track" url="https://www.supahabits.com/dashboard/mood" />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mood" title="How are you feeling today?" value={todayMood} onChange={setTodayMood}>
        {moods.map((mood) => (
          <Form.Dropdown.Item key={mood.value} value={mood.value} title={mood.label} icon={mood.Icon} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="content" title="Add a note (optional)" defaultValue="" />
    </Form>
  );
}
