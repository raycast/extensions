import { Detail, List, Icon, ActionPanel, Action, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchMessages, openEmail, deleteMessage } from "./utils";
import path from "path";

interface messages {
  id: string;
  subject: string;
  from: from;
  intro: string;
  createdAt: string;
}

interface from {
  name: string;
  address: string;
}

export default function Command() {
  const [messages, setMessages] = useState<messages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function response() {
      const emails = await fetchMessages();

      if (!emails) {
        popToRoot();
        return <Detail />;
      }

      setMessages(emails);
      setLoading(false);
    }
    response();
  }, []);

  return (
    <List isLoading={loading} navigationTitle="Mails">
      {messages.map((item) => (
        <List.Item
          icon={Icon.Message}
          key={item.id}
          title={item.subject}
          subtitle={item.intro}
          accessories={[
            { text: `${new Date(item.createdAt).toLocaleString()}`, icon: Icon.Calendar },
            { icon: Icon.Person, tooltip: item.from.name },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title={"Open Email"} icon={Icon.Envelope} target={<Email id={item.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Email({ id }: { id: string }) {
  const [email, setEmail] = useState<string>();
  const [subject, setSubject] = useState<string>();

  useEffect(() => {
    async function response() {
      const email = await openEmail(id);

      setEmail(email.text);
      setSubject(email.subject);
    }
    response();
  }),
    [];

  const dir = path.dirname(__filename);

  return (
    <Detail
      markdown={email}
      isLoading={!email}
      navigationTitle={subject}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${dir}/assets/email.html`} />
          <Action title="Delete Email" onAction={async () => await deleteMessage(id)} icon={Icon.Trash}></Action>
        </ActionPanel>
      }
    ></Detail>
  );
}
