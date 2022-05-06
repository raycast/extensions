import { Form, ActionPanel, Action, showToast, Toast, showHUD, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { Session } from "./auth";
import fetch, { Response } from "node-fetch";

const createMaskedEmail = async (session: Session, description: string): Promise<Response> => {
  return fetch("https://api.fastmail.com/jmap/api/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      using: ["urn:ietf:params:jmap:core", "https://www.fastmail.com/dev/maskedemail"],
      methodCalls: [
        [
          "MaskedEmail/set",
          { accountId: session.accountId, create: { onepassword: { forDomain: description, state: "enabled" } } },
          0,
        ],
      ],
    }),
  });
};

const MaskedEmailForm = ({ session }: { session: Session }) => {
  const [description, setDescription] = useState("");
  const [submitForm, setSubmitForm] = useState(false);

  useEffect(() => {
    if (!description || !submitForm) {
      return;
    }
    (async () => {
      const response = await createMaskedEmail(session, description);

      const json = (await response.json()) as {
        methodResponses: [
          [
            name: "MaskedEmail/set",
            arguments?: { created?: { onepassword?: { email?: string } } },
            methodCallId?: string
          ]
        ];
      };
      const email = json.methodResponses[0]?.[1]?.created?.onepassword?.email;

      if (!email) {
        showToast({
          style: Toast.Style.Failure,
          title: "There was a problem creating the masked email. Please try again.",
        });
        return;
      }

      Clipboard.copy(email);
      showHUD(`"${email}" has been copied to your clipboard`);
    })();
  }, [submitForm]);

  return (
    <Form
      navigationTitle="New masked email"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={() => setSubmitForm(true)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Remind yourself what this email is for" />
      <Form.TextField id="label" title="Description" onChange={setDescription} />
    </Form>
  );
};

export default MaskedEmailForm;
