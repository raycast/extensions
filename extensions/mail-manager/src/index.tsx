import "@jxa/global-type";
import { run } from "@jxa/run";
import { ActionPanel, List, Action, closeMainWindow, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import { Mail } from "@jxa/types/src/core/Mail";

type PreparedList = {
  accountName: string,
  mailboxes: { name: string, originalName: string, unreadCount: number }[],
  params: { id: string, userName: string, accountType: string }
}[]
export default function Command() {
  const [list, setList] = useState<PreparedList>([]);
  const [selection, setSelection] = useState<unknown[]>([]);

  useEffect(() => {
    run<{ list: PreparedList, selection: unknown[] }>(() => {
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
        return parentIsAccount ? name + append : getMailboxName(parent, `/${name}`);
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
            id: accounts[i].id()
          },
          mailboxes: []
        });
        for (let j = 0; j < accounts[i].mailboxes.length; j++) {
          const name = getMailboxName(accounts[i].mailboxes[j], "");
          list[i].mailboxes.push({
            name,
            originalName: accounts[i].mailboxes[j].name(),
            unreadCount: accounts[i].mailboxes[j].unreadCount()
          });
        }
      }
      return { list, selection };
    })
      .then(({ list, selection }) => {
        setList(list);
        setSelection(selection);
      })
      .catch(err => {
        console.log(err);
      });
  }, []);

  function addToMailbox({ accountId, mailboxName }: {
    accountId: string,
    mailboxName: string
  }) {
    run((accountId, mailboxName) => {
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
      const selection: [] = mail.selection();
      for (let i = 0; i < selection.length; i++) {
        const message = selection[i];
        mail.move(message, { to: mailbox });
      }
    }, accountId, mailboxName)
      .then(() => {
        void closeMainWindow();
      })
      .catch(err => {
        console.log(err);
      });
  }

  function goToMailbox({ accountId, mailboxName }: {
    accountId?: string,
    mailboxName: string
  }) {
    run((accountId, mailboxName) => {
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
      // mail.open(mailbox);
      mail.activate();
      if (mail.messageViewers().length === 0) {
        mail.MessageViewer().make();
      }
      const mv = mail.messageViewers()[0];
      mv.selectedMailboxes.set(
        mailboxName === "All Inboxes"
          ? mv.inbox()
          : mailboxName === "All Drafts"
            ? mv.draftsMailbox()
            : mailbox
      );
    }, accountId, mailboxName)
      .then(() => {
        void closeMainWindow();
      })
      .catch(err => {
        console.log(err);
      });
  }

  return (
    <List
      searchBarPlaceholder={environment.commandName === "index"
        ? `Search mailboxes to move ${selection?.length} selected emails to...`
        : "Search mailboxes to move..."
      }
    >
      {environment.commandName === "goto"
        ? (<List.Section title="All" key="All">
          <List.Item
            title={"Inboxes"}
            id={"All Inboxes"}
            key={"All Inboxes"}
            actions={
              <ActionPanel>
                <Action
                  title={`Go to Inboxes`}
                  onAction={() => goToMailbox({ mailboxName: "All Inboxes" })}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title={"Drafts"}
            id={"All Drafts"}
            key={"All Drafts"}
            actions={
              <ActionPanel>
                <Action
                  title={`Go to Drafts`}
                  onAction={() => goToMailbox({ mailboxName: "All Drafts" })}
                />
              </ActionPanel>
            }
          />
        </List.Section>)
        : ""}
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
                    {environment.commandName === "index"
                      ? <Action
                        title={`Move to ${name}`}
                        onAction={() => addToMailbox({
                          accountId: params?.id,
                          mailboxName: originalName
                        })}
                      />
                      : <Action
                        title={`Go to ${name}`}
                        onAction={() => goToMailbox({
                          accountId: params?.id,
                          mailboxName: originalName
                        })}
                      />}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>);
      })}
    </List>
  );
}
