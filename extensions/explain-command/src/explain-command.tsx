import {
  Action,
  ActionPanel,
  Detail,
  Form,
  PreferenceValues,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import axios from "axios";
import { useState } from "react";

export default function Command() {
  const { push } = useNavigation();

  const preferences = getPreferenceValues<PreferenceValues>();

  const [loading, setLoading] = useState(false);

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async ({ command }: { command: string }) => {
              setLoading(true);

              axios
                .post(
                  "https://api.openai.com/v1/chat/completions",
                  {
                    model: "gpt-3.5-turbo",
                    messages: [
                      {
                        role: "user",
                        content: `Respond in markdown, explain this command and include links to the documentation: ${command}`,
                      },
                    ],
                    temperature: 0.7,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${preferences.token}`,
                    },
                  }
                )
                .then(({ data }) => {
                  if (data.choices.length === 0) {
                    return showToast({
                      style: Toast.Style.Failure,
                      title: "No choices found",
                    });
                  }

                  push(<Result content={data.choices[0].message.content} />);
                })
                .catch((error) => {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Something went wrong",
                    message: error.message,
                  });
                })
                .finally(() => {
                  setLoading(false);
                });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="command" title="Command" placeholder="Command" />
    </Form>
  );
}

function Result({ content }: { content: string }) {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={content}
      actions={
        <ActionPanel>
          <Action title="Pop" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
