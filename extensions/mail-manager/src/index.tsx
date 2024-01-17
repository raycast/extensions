import "@jxa/global-type";
import { run } from "@jxa/run";
import { ActionPanel, List, Action, closeMainWindow, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { Mail } from "@jxa/types/src/core/Mail";

type PreparedList = {
  accountName: string;
  mailboxes: { name: string; originalName: string; unreadCount: number }[];
  params: { id: string; userName: string; accountType: string };
}[];
export default function Command() {
  const [list, setList] = useState<PreparedList>([]);
  const [selection, setSelection] = useState<unknown[]>([]);

  useEffect(() => {
    run<{ list: PreparedList; selection: unknown[] }>(() => {
      function getMailboxName(mailbox: Mail.Mailbox, append: string): string {
        const name = mailbox.name();
        const parent = mailbox.container();
        let parentIsAccount;
        try {
          parent?.userName();
          parentIsAccount = true;
        } catch (e) {
          parentIsAccount = false;
        }
        return parentIsAccount ? name + append : getMailboxName(parent, `/${name}` + append);
      }

      const mail = Application("Mail");
      const accounts = mail.accounts;
      const selection: [] = mail.selection();
      const list: PreparedList = [];
      for (let i = 0; i < accounts.length; i++) {
        list.push({
          accountName: accounts[i].name(),
          params: {
            accountType: accounts[i].accountType(),
            userName: accounts[i].userName(),
            id: accounts[i].id(),
          },
          mailboxes: [],
        });
        for (let j = 0; j < accounts[i].mailboxes.length; j++) {
          const name = getMailboxName(accounts[i].mailboxes[j], "");
          list[i].mailboxes.push({
            name,
            originalName: accounts[i].mailboxes[j].name(),
            unreadCount: accounts[i].mailboxes[j].unreadCount(),
          });
        }
      }
      return { list, selection };
    })
      .then(({ list, selection }) => {
        setList(list);
        setSelection(selection);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  function addToMailbox({ accountId, mailboxName }: { accountId: string; mailboxName: string }) {
    run(
      (accountId, mailboxName) => {
        const mail = Application("Mail");
        const accounts = mail.accounts;
        // Get mailbox object to move messages to
        let mailbox = null;
        for (let i = 0; i < accounts.length; i++) {
          if (accounts[i].id() === accountId) {
            const mailboxes = accounts[i].mailboxes;
            for (let j = 0; j < mailboxes.length; j++) {
              if (mailboxes[j].name() === mailboxName) {
                mailbox = mailboxes[j];
                break;
              }
            }
          }
        }
        type MessageLocal = {
          after: () => MessageLocal;
          before: () => MessageLocal;
        } & Mail.Message;
        // Currently selected messages
        const selection: MessageLocal[] = mail.selection();
        // Gets current mailbox
        const currentMailboxes = mail.messageViewers[0].selectedMailboxes();
        // Get possible selections after move
        let afterMoveSelect: MessageLocal[] = [];
        try {
          afterMoveSelect.push(selection[0].before());
        } catch (e) {
          // Do nothing
        }
        try {
          afterMoveSelect.push(selection[0].after());
        } catch (e) {
          // Do nothing
        }
        try {
          afterMoveSelect.push(selection[selection.length - 1].before());
        } catch (e) {
          // Do nothing
        }
        try {
          afterMoveSelect.push(selection[selection.length - 1].after());
        } catch (e) {
          // Do nothing
        }
        // Filter out the ones that are selected
        afterMoveSelect = afterMoveSelect.filter(function (m: Mail.Message): boolean {
          return (
            selection.filter((s: Mail.Message) => {
              return s?.id() === m?.id();
            }).length === 0
          );
        });
        // Move selected messages to mailbox
        for (let i = 0; i < selection.length; i++) {
          const message = selection[i];
          mail.move(message, { to: mailbox });
        }
        // Select messages after move
        if (afterMoveSelect.length > 0) {
          try {
            mail.messageViewers[0].selectedMessages = afterMoveSelect[0].before();
          } catch (e) {
            try {
              mail.messageViewers[0].selectedMessages = afterMoveSelect[0].after();
            } catch (e) {
              try {
                mail.messageViewers[0].selectedMessages = afterMoveSelect[0];
              } catch (e) {
                console.log("Failed to select messages after move.");
              }
            }
          }
        } else {
          // If failed to get before and after message select the first message in one of the selected mailboxes
          for (let i = 0; i < currentMailboxes.length; i++) {
            if (currentMailboxes[i].messages.length > 0) {
              mail.messageViewers[0].selectedMessages =
                currentMailboxes[i].messages.length > 0 ? currentMailboxes[i].messages[0] : null;
              break;
            }
          }
        }
      },
      accountId,
      mailboxName,
    )
      .then(() => {
        void closeMainWindow();
        void run(() => {
          if (Application("Mail").selection().length === 0) {
            // If failed to select then use keystorke to select the first message in the first mailbox
            Application("System Events").keyCode(125);
          }
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function goToMailbox({ accountId, mailboxName }: { accountId?: string; mailboxName: string }) {
    run(
      (accountId, mailboxName) => {
        const mail = Application("Mail");
        const accounts = mail.accounts;
        let mailbox = null;
        for (let i = 0; i < accounts.length; i++) {
          if (accounts[i].id() === accountId) {
            const mailboxes = accounts[i].mailboxes;
            for (let j = 0; j < mailboxes.length; j++) {
              if (mailboxes[j].name() === mailboxName) {
                mailbox = mailboxes[j];
                break;
              }
            }
          }
        }
        mail.activate();
        if (mail.messageViewers().length === 0) {
          mail.MessageViewer().make();
        }
        const mv = mail.messageViewers()[0];
        mv.selectedMailboxes.set(
          mailboxName === "All Inboxes" ? mv.inbox() : mailboxName === "All Drafts" ? mv.draftsMailbox() : mailbox,
        );
      },
      accountId,
      mailboxName,
    )
      .then(() => {
        void closeMainWindow();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <List
      searchBarPlaceholder={
        environment.commandName === "index"
          ? `Search mailboxes to move ${selection?.length} selected emails to...`
          : "Search mailboxes to move..."
      }
    >
      {environment.commandName === "goto" ? (
        <List.Section title="All" key="All">
          <List.Item
            title={"Inboxes"}
            id={"All Inboxes"}
            key={"All Inboxes"}
            actions={
              <ActionPanel>
                <Action title={`Go to Inboxes`} onAction={() => goToMailbox({ mailboxName: "All Inboxes" })} />
              </ActionPanel>
            }
          />
          <List.Item
            title={"Drafts"}
            id={"All Drafts"}
            key={"All Drafts"}
            actions={
              <ActionPanel>
                <Action title={`Go to Drafts`} onAction={() => goToMailbox({ mailboxName: "All Drafts" })} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        ""
      )}
      {list.map(({ accountName, mailboxes, params }) => {
        return (
          <List.Section title={accountName} subtitle={params?.userName} key={accountName}>
            {mailboxes.map(({ name, originalName, unreadCount }) => (
              <List.Item
                id={name}
                title={name}
                subtitle={"(" + unreadCount + ")"}
                key={name}
                actions={
                  <ActionPanel>
                    {environment.commandName === "index" ? (
                      <Action
                        title={`Move to ${name}`}
                        onAction={() =>
                          addToMailbox({
                            accountId: params?.id,
                            mailboxName: originalName,
                          })
                        }
                      />
                    ) : (
                      <Action
                        title={`Go to ${name}`}
                        onAction={() =>
                          goToMailbox({
                            accountId: params?.id,
                            mailboxName: originalName,
                          })
                        }
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
