import { Detail, List, Icon, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchMessages, openEmail } from "./utils";

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
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function response() {
      const emails = await fetchMessages();

      !emails && setError("# Create Account First");

      setMessages(emails);
      setLoading(false);
    }
    response();
  }, []);

  if (error) return <Detail markdown={error} />;

  if (messages.length === 0) return <Detail markdown={`# No Emails`} />;

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
              <Action.Push title={"Open Email"} target={<Email id={item.id} />} />
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
    [id];

  return <Detail markdown={email} isLoading={!email} navigationTitle={subject}></Detail>;
}
