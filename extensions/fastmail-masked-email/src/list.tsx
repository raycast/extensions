import { Action, ActionPanel, Color, Icon, Image, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { MaskedEmail, MaskedEmailState, updateMaskedEmailState, retrieveAllMaskedEmails } from "./fastmail";

type Preferences = {
  show_deleted: boolean;
  show_pending: boolean;
};

export default function Command() {
  const { show_deleted, show_pending } = getPreferenceValues<Preferences>();
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
          if (email.state === MaskedEmailState.Deleted && show_deleted === false) {
            return false;
          }

          if (email.state === MaskedEmailState.Pending && show_pending === false) {
            return false;
          }

          return true;
        })
        .sort((lhs, rhs) => sortOrder[rhs.state] - sortOrder[lhs.state]),
    );
  };

  const updateMaskedEmail = async (email: MaskedEmail, state: MaskedEmailState) => {
    await updateMaskedEmailState(email, state);

    updateMaskedEmails(maskedEmails.map((e) => (e.id === email.id ? { ...e, state } : e)));
  };

  const toggleMaskedEmail = async (email: MaskedEmail) => {
    const state = email.state === MaskedEmailState.Enabled ? MaskedEmailState.Disabled : MaskedEmailState.Enabled;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${state === MaskedEmailState.Disabled ? "Blocking" : "Unblocking"} masked email...`,
    });

    try {
      await updateMaskedEmail(email, state);

      toast.style = Toast.Style.Success;
      toast.title = `Masked email ${state === MaskedEmailState.Disabled ? "blocked" : "unblocked"}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${state === MaskedEmailState.Disabled ? "block" : "unblock"} masked email`;
      toast.message =
        error instanceof Error
          ? error.message
          : "An error occurred while updating the masked email, please try again later";
    }
  };

  const deleteMaskedEmail = async (email: MaskedEmail) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting masked email..." });

    try {
      await updateMaskedEmail(email, MaskedEmailState.Deleted);

      toast.style = Toast.Style.Success;
      toast.title = "Masked email deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete masked email";
      toast.message =
        error instanceof Error
          ? error.message
          : "An error occurred while updating the masked email, please try again later";
    }
  };

  const restoreMaskedEmail = async (email: MaskedEmail) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Restoring masked email..." });

    try {
      await updateMaskedEmail(email, MaskedEmailState.Enabled);

      toast.style = Toast.Style.Success;
      toast.title = "Masked email restored";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to restore masked email";
      toast.message =
        error instanceof Error
          ? error.message
          : "An error occurred while updating the masked email, please try again later";
    }
  };

  useEffect(() => {
    const listMaskedEmails = async () => {
      const emails = await retrieveAllMaskedEmails();

      updateMaskedEmails(emails);
    };

    listMaskedEmails().catch(console.error);
  }, []);

  return (
    <List isLoading={maskedEmails.length <= 0}>
      {maskedEmails.map((email) => {
        const canBlockUnblock = [MaskedEmailState.Enabled, MaskedEmailState.Disabled].includes(email.state);
        const canRestore = email.state === MaskedEmailState.Deleted;
        const canView = email.state !== MaskedEmailState.Pending;

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
                {canView && (
                  <Action.OpenInBrowser
                    title="View in Fastmail"
                    url={`https://app.fastmail.com/settings/masked/${email.id}`}
                  />
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
    case MaskedEmailState.Pending:
      return { source: Icon.Pause, tintColor: Color.Blue };

    case MaskedEmailState.Deleted:
      return { source: Icon.Trash, tintColor: Color.Red };

    case MaskedEmailState.Enabled:
      return { source: Icon.Check, tintColor: Color.Green };

    case MaskedEmailState.Disabled:
      return { source: Icon.Stop, tintColor: Color.Orange };
  }
};

const accessoryForMaskedEmail: (maskedEmail: MaskedEmail) => List.Item.Accessory = (maskedEmail) => {
  let color: Color;
  let value: string;

  switch (maskedEmail.state) {
    case MaskedEmailState.Pending:
      color = Color.Blue;
      value = "Pending";
      break;

    case MaskedEmailState.Deleted:
      color = Color.Red;
      value = "Deleted";
      break;

    case MaskedEmailState.Enabled:
      color = Color.Green;
      value = "Active";
      break;

    case MaskedEmailState.Disabled:
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
