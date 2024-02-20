import { useEffect, useState } from "react";
import { Color, List, Icon, Image, ActionPanel, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { APIRequest, makeRequest, getSession } from "./api";
import { hideToast } from "./utils";

type Preferences = {
  show_deleted: boolean;
  show_pending: boolean;
};

type ListMaskedEmail = {
  accountId?: string;
  get: {
    ids: [string] | null;
  };
};

enum MaskedEmailState {
  Pending = "pending",
  Enabled = "enabled",
  Disabled = "disabled",
  Deleted = "deleted",
}

type MaskedEmail = {
  id: string;
  email: string;
  state: MaskedEmailState;
  forDomain: string;
  description: string;
  url: string | null;
  lastMessageAt: string;
};

type MaskedEmailGet = {
  list: [MaskedEmail];
};

type UpdateMaskedEmail = {
  accountId?: string;
  update: Record<
    string,
    {
      state: "pending" | "enabled" | "disabled" | "deleted";
      description?: string;
      emailPrefix?: string;
    }
  >;
};

type MaskedEmailSet = {
  updated: Record<
    string,
    {
      email: string;
    }
  >;
};

const MaskedEmailCapability = "https://www.fastmail.com/dev/maskedemail";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [maskedEmails, setMaskedEmails] = useState<MaskedEmail[]>([]);

  const updateMaskedEmails = (emails: MaskedEmail[]) => {
    const sortOrder: { [key in MaskedEmailState]: number } = {
      [MaskedEmailState.Deleted]: 0,
      [MaskedEmailState.Disabled]: 1,
      [MaskedEmailState.Pending]: 2,
      [MaskedEmailState.Enabled]: 3,
    };

    setMaskedEmails(
      emails
        .filter((email) => {
          if (email.state === MaskedEmailState.Deleted && preferences.show_deleted === false) {
            return false;
          }

          if (email.state === MaskedEmailState.Pending && preferences.show_pending === false) {
            return false;
          }

          return true;
        })
        .sort((lhs, rhs) => sortOrder[rhs.state] - sortOrder[lhs.state])
    );
  };

  const updateMaskedEmailState = async (email: MaskedEmail, state: MaskedEmailState) => {
    const session = await getSession();
    const request: APIRequest<UpdateMaskedEmail> = {
      using: ["urn:ietf:params:jmap:core", MaskedEmailCapability],
      methodCalls: [
        [
          "MaskedEmail/set",
          {
            accountId: session.primaryAccounts[MaskedEmailCapability],
            update: {
              [email.id]: {
                state,
              },
            },
          },
          "0",
        ],
      ],
    };
    await makeRequest<UpdateMaskedEmail, MaskedEmailSet>({ request });
    updateMaskedEmails(maskedEmails.map((e) => (e.id === email.id ? { ...e, state } : e)));
  };

  const toggleMaskedEmail = async (email: MaskedEmail) => {
    const state = email.state === MaskedEmailState.Enabled ? MaskedEmailState.Disabled : MaskedEmailState.Enabled;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${state === MaskedEmailState.Disabled ? "Blocking" : "Unblocking"} masked email...`,
    });

    try {
      await updateMaskedEmailState(email, state);

      toast.title = `Masked email ${state === MaskedEmailState.Disabled ? "blocked" : "unblocked"}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.title = `Failed to ${state === MaskedEmailState.Disabled ? "block" : "unblock"} masked email: ${error}`;
      toast.style = Toast.Style.Failure;
    } finally {
      hideToast(toast, 2000);
    }
  };

  const deleteMaskedEmail = async (email: MaskedEmail) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting masked email..." });

    try {
      await updateMaskedEmailState(email, MaskedEmailState.Deleted);
      toast.title = "Masked email deleted";
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.title = "Failed to delete masked email: ${error}";
      toast.style = Toast.Style.Failure;
    } finally {
      hideToast(toast, 2000);
    }
  };

  const restoreMaskedEmail = async (email: MaskedEmail) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Restoring masked email..." });

    try {
      await updateMaskedEmailState(email, MaskedEmailState.Enabled);
      toast.title = "Masked email restored";
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.title = "Failed to restore masked email: ${error}";
      toast.style = Toast.Style.Failure;
    } finally {
      hideToast(toast, 2000);
    }
  };

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
        updateMaskedEmails(emails);
      } catch (error) {
        throw new Error(`Failed to list masked emails: ${error}`);
      }
    };

    listMaskedEmails().catch(console.error);
  }, []);

  return (
    <List isLoading={maskedEmails.length <= 0}>
      {maskedEmails.map((email) => {
        const canBlockUnblock = [MaskedEmailState.Enabled, MaskedEmailState.Disabled].includes(email.state);
        const canRestore = email.state === MaskedEmailState.Deleted;

        return (
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
                {canBlockUnblock && (
                  <Action
                    icon={email.state === MaskedEmailState.Enabled ? Icon.Stop : Icon.Play}
                    title={`${email.state === MaskedEmailState.Enabled ? "Block" : "Unblock"} Masked Email`}
                    onAction={() => toggleMaskedEmail(email)}
                  />
                )}
                {canBlockUnblock && (
                  <Action icon={Icon.Trash} title="Delete Masked Email" onAction={() => deleteMaskedEmail(email)} />
                )}
                {canRestore && (
                  <Action icon={Icon.Undo} title="Restore Masked Email" onAction={() => restoreMaskedEmail(email)} />
                )}
              </ActionPanel>
            }
          />
        );
      })}
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
  let value: string;

  switch (maskedEmail.state) {
    case "pending":
      color = Color.Blue;
      value = "Pending";
      break;

    case "deleted":
      color = Color.Red;
      value = "Deleted";
      break;

    case "enabled":
      color = Color.Green;
      value = "Active";
      break;

    case "disabled":
      color = Color.Orange;
      value = "Blocked";
      break;
  }

  // `tag` is documented but appears to be missing in the TypeScript types.
  // We're using tag here instead of text because tag changes both the text
  // color to the provided color and sets a transparent background with the
  // same color. Whereas text only sets the text color. We add a `null` tooltip
  // to make TypeScript happy.
  return { tag: { value, color }, tooltip: null };
};
