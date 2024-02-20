import { useEffect, useState } from "react";
import { Color, List, Icon, Image, ActionPanel, Action } from "@raycast/api";
import { APIRequest, makeRequest, getSession } from "./api";

type ListMaskedEmail = {
  accountId?: string;
  get: {
    ids: [string] | null;
  };
};

type MaskedEmail = {
  id: string;
  email: string;
  state: "pending" | "enabled" | "disabled" | "deleted";
  forDomain: string;
  description: string;
  url: string | null;
  lastMessageAt: string;
};

type MaskedEmailGet = {
  list: [MaskedEmail];
};

const MaskedEmailCapability = "https://www.fastmail.com/dev/maskedemail";

export default function Command() {
  const [maskedEmails, setMaskedEmails] = useState<MaskedEmail[]>([]);

  useEffect(() => {
    const listMaskedEmails = async () => {
      const session = await getSession();
      const request: APIRequest<ListMaskedEmail> = {
        using: ["urn:ietf:params:jmap:core", MaskedEmailCapability],
        methodCalls: [
          [
            "MaskedEmail/get",
            {
              accountId: session.primaryAccounts[MaskedEmailCapability],
              get: {
                ids: null,
              },
            },
            "0",
          ],
        ],
      };

      try {
        const response = await makeRequest<ListMaskedEmail, MaskedEmailGet>({ request });
        const emails: MaskedEmail[] = response.methodResponses[0][1].list;

        const sortOrder: { [key in MaskedEmail["state"]]: number } = {
          deleted: 0,
          disabled: 1,
          pending: 2,
          enabled: 3,
        };
        emails.sort((lhs, rhs) => sortOrder[rhs.state] - sortOrder[lhs.state]);
        setMaskedEmails(emails);
      } catch (error) {
        throw new Error(`Failed to list masked emails: ${error}`);
      }
    };

    listMaskedEmails().catch(console.error);
  }, []);

  return (
    <List isLoading={maskedEmails.length <= 0}>
      {maskedEmails.map((email) => (
        <List.Item
          icon={iconForMaskedEmail(email)}
          key={email.id}
          title={email.email}
          subtitle={email.forDomain || email.description}
          keywords={[email.description]}
          accessories={[accessoryForMaskedEmail(email)]}
          actions={
            <ActionPanel title={email.email}>
              <Action.CopyToClipboard title="Copy Masked Email" content={email.email} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const iconForMaskedEmail: (maskedEmail: MaskedEmail) => Image = (maskedEmail) => {
  switch (maskedEmail.state) {
    case "pending":
      return { source: Icon.Pause, tintColor: Color.Blue };

    case "deleted":
      return { source: Icon.Trash, tintColor: Color.Red };

    case "enabled":
      return { source: Icon.Check, tintColor: Color.Green };

    case "disabled":
      return { source: Icon.Stop, tintColor: Color.Orange };
  }
};

const accessoryForMaskedEmail: (maskedEmail: MaskedEmail) => List.Item.Accessory = (maskedEmail) => {
  let color: Color;

  switch (maskedEmail.state) {
    case "pending":
      color = Color.Blue;
      break;

    case "deleted":
      color = Color.Red;
      break;

    case "enabled":
      color = Color.Green;
      break;

    case "disabled":
      color = Color.Orange;
      break;
  }

  // `tag` is documented but appears to be missing in the TypeScript types.
  // We're using tag here instead of text because tag changes both the text
  // color to the provided color and sets a transparent background with the
  // same color. Whereas text only sets the text color. We add a `null` tooltip
  // to make TypeScript happy.
  return { tag: { value: maskedEmail.state, color }, tooltip: null };
};
