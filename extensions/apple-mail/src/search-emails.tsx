import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  Color,
  confirmAlert,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getEmailSubjectsAndIDs,
  getEmailContentByID,
  deleteEmailByID,
  setEmailReadByID,
  openEmailByID,
  junkEmailByID,
  flagEmailByID,
  setEmailUnreadByID,
  unflagEmailByID,
  unjunkEmailByID,
  getMailboxNamesByID,
  restoreEmailByID,
} from "./utils";

interface Arguments {
  searchTerm: string;
}

const EmailDetail = (props: {
  email: { [key: string]: string };
  mailbox: { [key: string]: string };
  actionInitiated: boolean;
  onUpdate: () => void;
}) => {
  const { email, mailbox, actionInitiated, onUpdate } = props;
  const [content, setContent] = useState<string>("");
  const [shouldUpdateReadStatus, setShouldUpdateReadStatus] = useState<boolean>(false);

  useEffect(() => {
    // Load contact of email
    Promise.resolve(getEmailContentByID(email.id)).then((content) => setContent(content));
    if (email.readStatus != "true") {
      // Only update the read status if user views detail for at least 1 second
      setTimeout(() => setShouldUpdateReadStatus(true), 1000);
    }
  }, []);

  useEffect(() => {
    if (shouldUpdateReadStatus) {
      // Set read status to true
      Promise.resolve(setEmailReadByID(email.id)).then(() => onUpdate());
    }
  }, [shouldUpdateReadStatus]);

  return (
    <List.Item.Detail
      markdown={`# ${email.subject || "No Subject"}
        \nFrom: _${email.sender}_
        \nMailbox: _${mailbox.name}_
        ${actionInitiated || email.deletedStatus == "true" ? "" : `\n${(content || "_Loading..._").trim()}`}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Message Information" />
          <List.Item.Detail.Metadata.Label title="Sender" text={email.sender} icon={Icon.Person} />
          <List.Item.Detail.Metadata.Label title="Date Sent" text={email.dateSent} icon={Icon.Calendar} />
          <List.Item.Detail.Metadata.Label title="Date Received" text={email.dateReceived} icon={Icon.Calendar} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Message Status" />
          <List.Item.Detail.Metadata.Label
            title="Flagged?"
            text={email.flaggedStatus == "true" ? "Yes" : "No"}
            icon={Icon.Exclamationmark2}
          />
          <List.Item.Detail.Metadata.Label
            title="Junk?"
            text={email.junkStatus == "true" ? "Yes" : "No"}
            icon={Icon.Box}
          />
          <List.Item.Detail.Metadata.Label
            title="Trash?"
            text={mailbox.name == "Deleted Messages" ? "Yes" : "No"}
            icon={Icon.Trash}
          />
          <List.Item.Detail.Metadata.Label
            title="Deleted?"
            text={email.deletedStatus == "true" ? "Yes" : "No"}
            icon={Icon.DeleteDocument}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const updateEmails = (
  // Update list of emails with current email data
  setEmails: (value: React.SetStateAction<{ [key: string]: string }[]>) => void
) => {
  getEmailSubjectsAndIDs().then((messages: { [key: string]: string }[]) => {
    setEmails(messages);
  });
};

const updateMailboxes = (
  setMailboxes: (
    // Update list of mailboxes with current email mailbox data
    value: React.SetStateAction<{ emailID: string; name: string }[]>
  ) => void
) => {
  Promise.resolve(getMailboxNamesByID()).then((mailboxData) => {
    const mailboxes = [];
    const entries = mailboxData.split(/, ?/g);
    for (let i = 0; i < entries.length; i += 2) {
      mailboxes.push({
        emailID: entries[i],
        name: entries[i + 1],
      });
    }
    setMailboxes(mailboxes);
  });
};

export default function Command(props: { arguments: Arguments }) {
  const { searchTerm } = props.arguments;
  const [emails, setEmails] = useState<{ [key: string]: string }[]>([]);
  const [mailboxes, setMailboxes] = useState<{ emailID: string; name: string }[]>([]);
  const [actionInitiated, setActionInitiated] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    // Load initial email and mailbox data
    setSearchText(searchTerm);
    updateEmails(setEmails);
    updateMailboxes(setMailboxes);
  }, []);

  const listItems: JSX.Element[] = [];
  emails
    .sort((a, b) => (a.subject > b.subject || (a.subject == "" && b.subject != "") ? 1 : -1))
    .forEach((email) => {
      const matchingMailboxes = mailboxes.filter((mailbox) => mailbox.emailID == email.id);

      // Attach mailbox name based on email ID
      let mailbox: { emailID: string; name: string } = { emailID: "", name: "" };
      if (matchingMailboxes.length > 0) {
        mailbox = matchingMailboxes[0];
      }

      // Apply tags in list view
      const tags = [];
      if (email.flaggedStatus == "true") {
        tags.push({ icon: { source: Icon.Exclamationmark2, tintColor: Color.Yellow }, tooltip: "Flagged" });
      }
      if (mailbox.name == "Deleted Messages") {
        tags.push({ icon: { source: Icon.Trash, tintColor: Color.Red }, tooltip: "Trash" });
      }
      if (email.junkMailStatus == "true") {
        tags.push({ icon: { source: Icon.Box, tintColor: Color.Blue }, tooltip: "Junk" });
      }
      if (email.deletedStatus == "true") {
        tags.push({ icon: { source: Icon.DeleteDocument }, tooltip: "Deleted" });
      }

      listItems.push(
        <List.Item
          key={email.id}
          title={email.subject || "No Subject"}
          icon={email.readStatus == "true" ? Icon.CheckCircle : { source: Icon.Bell, tintColor: Color.Red }}
          keywords={[email.sender, email.dateReceived, email.id, email.replyTo]}
          detail={
            <EmailDetail
              email={email}
              mailbox={mailbox}
              actionInitiated={actionInitiated}
              onUpdate={() => updateEmails(setEmails)}
            />
          }
          accessories={tags}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Email Controls">
                <Action
                  title="View In Mail"
                  icon={Icon.AppWindow}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  onAction={async () => {
                    try {
                      await openEmailByID(email.id);
                    } catch (error) {
                      console.log("E-V-1", error);
                      showToast({ title: "Couldn't view email in Mail.app", style: Toast.Style.Failure });
                    }
                  }}
                />

                {email.readStatus == "true" ? (
                  <Action
                    title="Mark As Unread"
                    icon={Icon.Bell}
                    shortcut={{ modifiers: ["cmd"], key: "u" }}
                    onAction={async () => {
                      try {
                        await setEmailUnreadByID(email.id);
                      } catch (error) {
                        console.log("E-R-1", error);
                        showToast({ title: "Couldn't mark email as unread", style: Toast.Style.Failure });
                      }
                      updateEmails(setEmails);
                    }}
                  />
                ) : null}

                {email.flaggedStatus == "false" ? (
                  <Action
                    title="Flag"
                    icon={Icon.Exclamationmark2}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={async () => {
                      try {
                        await flagEmailByID(email.id);
                      } catch (error) {
                        console.log("E-F-1", error);
                        showToast({ title: "Couldn't flag email", style: Toast.Style.Failure });
                      }
                      updateEmails(setEmails);
                    }}
                  />
                ) : (
                  <Action
                    title="Unflag"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={async () => {
                      try {
                        await unflagEmailByID(email.id);
                      } catch (error) {
                        console.log("E-F-2", error);
                        showToast({ title: "Couldn't unflag email", style: Toast.Style.Failure });
                      }
                      updateEmails(setEmails);
                    }}
                  />
                )}

                {email.junkMailStatus == "false" ? (
                  <Action
                    title="Mark As Junk"
                    icon={Icon.Box}
                    shortcut={{ modifiers: ["cmd"], key: "j" }}
                    onAction={async () => {
                      try {
                        await junkEmailByID(email.id);
                      } catch (error) {
                        console.log("E-J-1", error);
                        showToast({ title: "Couldn't mark email as junk", style: Toast.Style.Failure });
                      }
                      updateEmails(setEmails);
                    }}
                  />
                ) : (
                  <Action
                    title="Mark As Not Junk"
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "j" }}
                    onAction={async () => {
                      try {
                        await unjunkEmailByID(email.id);
                      } catch (error) {
                        console.log("E-J-2", error);
                        showToast({ title: "Couldn't mark email as not junk", style: Toast.Style.Failure });
                      }
                      updateEmails(setEmails);
                    }}
                  />
                )}

                {mailbox.name == "Deleted Messages" || email.deletedStatus == "true" ? (
                  <Action
                    title="Restore"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={async () => {
                      setActionInitiated(true);
                      try {
                        await restoreEmailByID(email.id);
                      } catch (error) {
                        console.log("E-R-1", error);
                        showToast({ title: "Couldn't restore email", style: Toast.Style.Failure });
                      }
                      setActionInitiated(false);
                      updateEmails(setEmails);
                      updateMailboxes(setMailboxes);
                    }}
                  />
                ) : (
                  <Action
                    title="Move To Trash"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={async () => {
                      const options: Alert.Options = {
                        title: "Move Email To Trash",
                        message: "Are you sure?",
                        primaryAction: {
                          title: "Move To Trash",
                          style: Alert.ActionStyle.Destructive,
                        },
                      };
                      if (await confirmAlert(options)) {
                        setActionInitiated(true);
                        try {
                          await deleteEmailByID(email.id);
                        } catch (error) {
                          console.log("E-T-1", error);
                          showToast({ title: "Couldn't move email to trash", style: Toast.Style.Failure });
                        }
                        setActionInitiated(false);
                        updateEmails(setEmails);
                        updateMailboxes(setMailboxes);
                      }
                    }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section title="Information">
                <Action
                  title="Copy Email Content"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={async () => {
                    try {
                      await showHUD("Copied to Clipboard");
                      await closeMainWindow();
                      await Clipboard.copy(await getEmailContentByID(email.id));
                    } catch (error) {
                      console.log("E-C-1", error);
                      showToast({ title: "Failed to copy email content", style: Toast.Style.Failure });
                    }
                  }}
                />

                <Action.CopyToClipboard
                  title="Copy Sender Address"
                  content={email.sender}
                  shortcut={{ modifiers: ["cmd", "ctrl"], key: "c" }}
                />

                <Action.CopyToClipboard
                  title="Copy Email ID"
                  content={email.id}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      );
    });

  return (
    <List
      isLoading={!listItems.length}
      searchText={searchText || undefined}
      onSearchTextChange={(value) => setSearchText(value)}
      filtering={true}
      isShowingDetail={true}
    >
      <List.EmptyView
        icon={{ source: "no-view.png" }}
        title={emails.length > 0 ? `No matching emails found.` : `Loading emails...`}
      />
      {listItems}
    </List>
  );
}
