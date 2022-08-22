import { popToRoot, getPreferenceValues, Form, ActionPanel, Action, showHUD, Clipboard } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";

type Capabilities = "urn:ietf:params:jmap:core" | "https://www.fastmail.com/dev/maskedemail";

interface SessionResponse {
  primaryAccounts: { [key in Capabilities]: string };
  apiUrl: string;
}

interface Session {
  accountID: string;
  apiToken: string;
  apiURL: string;
}

const getSession = async (apiToken: string): Promise<Session> => {
  const response = await fetch(
    "https://api.fastmail.com/jmap/session",

    {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiToken}`,
      },
    }
  );

  const json = (await response.json()) as SessionResponse;
  console.log(json.apiUrl);
  return {
    apiToken: apiToken,
    accountID: json.primaryAccounts["https://www.fastmail.com/dev/maskedemail"],
    apiURL: json.apiUrl,
  };
};

interface CreatedMaskedEmailResponse {
  methodResponses: [
    [name: "MaskedEmail/set", arguments: { created: { "masked-fastmail": { email: string } } }, methodCallId?: string]
  ];
}

const createMaskedEmail = async ({
  session,
  description,
}: {
  session: Session;
  description: string;
}): Promise<string> => {
  const response = await fetch("https://api.fastmail.com/jmap/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.apiToken}`,
    },
    body: JSON.stringify({
      using: ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      methodCalls: [
        [
          "MaskedEmail/set",
          {
            accountId: session.accountID,
            create: {
              "masked-fastmail": {
                state: "enabled",
                description,
              },
            },
          },
          0,
        ],
      ],
    }),
  });

  const json = (await response.json()) as CreatedMaskedEmailResponse;
  return json.methodResponses[0]?.[1]?.created?.["masked-fastmail"]?.email;
};

export default function Command() {
  const [isLoading, setLoading] = useState(false);
  const [description, setDescription] = useState<string | undefined>(undefined);

  const { apiToken } = getPreferenceValues();

  useEffect(() => {
    const create = async () => {
      if (!isLoading || !description) {
        return;
      }

      setLoading(true);

      const session = await getSession(apiToken);

      const email = await createMaskedEmail({ session, description });

      Clipboard.copy(email);
      showHUD(`"${email}" has been copied to your clipboard`);

      popToRoot();
      setLoading(false);
    };

    create();
  }, [isLoading]);

  return (
    <Form
      navigationTitle="New masked email"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm shortcut={{ modifiers: [], key: "enter" }} onSubmit={() => setLoading(true)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Remind yourself what this email is for" />
      <Form.TextField autoFocus={true} id="label" title="Description" onChange={setDescription} />
    </Form>
  );
}
