import {
  Action,
  ActionPanel,
  Cache,
  Form,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

import SetSecret from "./components/set-secret";

const cache = new Cache();

export default function JournalCommand() {
  const secret = cache.get("secret");
  const [loading, setLoading] = useState<boolean>(false);

  if (!secret) {
    return <SetSecret />;
  }

  const submitEntry = async (values: { content: string }) => {
    if (!values.content || !values.content.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Content is required" });
      return;
    }

    setLoading(true);
    try {
      await fetch(`https://www.supahabits.com/api/journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, content: values.content }),
      });
      showToast({ style: Toast.Style.Success, title: "✅ Entry submitted!" });

      await launchCommand( {
        name: 'journal-list',
        type: LaunchType.UserInitiated,
      });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to submit entry" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <List isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Entry" onSubmit={submitEntry} />
          <Action.OpenInBrowser title="View All Entries" url="https://www.supahabits.com/dashboard/journal" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="New Journal Entry" defaultValue="" />
    </Form>
  );
}
