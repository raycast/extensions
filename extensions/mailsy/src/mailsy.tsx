import { useCallback, useEffect, useReducer, useState } from "react";
import { htmlToMarkdown, isLoggedIn, timeAgo, withToast, removeAccount, handleAction } from "./libs/utils";
import { createAccount, deleteAccount, getAccount, getMails, deleteMail, getMessage } from "./libs/api";
import { Action, ActionPanel, Color, Detail, Icon, List, popToRoot, environment, showHUD } from "@raycast/api";
import { useAccount } from "./hooks/useAccount";

enum View {
  Loading,
  Mails,
}

type State = {
  view: View;
};

type Action = { type: "SET_VIEW"; view: View };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.view };
    default:
      return state;
  }
}

export default function Command() {
  const [state, dispatch] = useReducer(reducer, { view: View.Loading });

  useEffect(() => {
    const init = async () => {
      const loggedIn: boolean = await isLoggedIn();
      if (loggedIn) {
        dispatch({ type: "SET_VIEW", view: View.Mails });
      } else {
        withToast({
          action: () => createAccount(),
          onSuccess: () => {
            dispatch({ type: "SET_VIEW", view: View.Mails });
            return "Account created successfully";
          },
          onFailure: () => "Account creation failed",
          loadingMessage: "Creating account...",
        })();
      }
    };
    init();
  }, []);

  switch (state.view) {
    case View.Loading:
      return <></>;
    case View.Mails:
      return <Mail />;
  }
}

// Mail.tsx
function Mail(): JSX.Element {
  const { data: Account } = useAccount(getAccount);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchMails = useCallback(() => getMails(), [refreshKey]);
  const { data: Mails } = useAccount(fetchMails);

  return (
    <List searchBarPlaceholder="Search Mails" isLoading={!Account || !Mails}>
      <List.Section title="Account">
        <List.Item
          title={Account?.email ?? ""}
          accessories={[
            { text: "Powered by" },
            { tag: { value: "mail.tm", color: Color.Purple }, tooltip: "https://mail.tm" },
          ]}
          icon={{ source: Icon.Envelope, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Copy">
                <Action.CopyToClipboard
                  title="Copy Email"
                  content={Account?.email ?? ""}
                  icon={{ source: Icon.Envelope, tintColor: Color.Purple }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action.CopyToClipboard
                  title="Copy Password"
                  content={Account?.password ?? ""}
                  icon={{ source: Icon.Key, tintColor: Color.Purple }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Account">
                <Action
                  title="Delete Account"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() =>
                    handleAction(
                      () => deleteAccount(),
                      () => popToRoot(),
                      `Deleting Account...`,
                      `Account deleted`,
                      `Account could not be deleted`,
                    )
                  }
                />
                <Action
                  title="Logout"
                  icon={{ source: Icon.Lock, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  onAction={() =>
                    handleAction(
                      () => removeAccount(),
                      () => popToRoot(),
                      `Logging out...`,
                      `Logout successful`,
                      `Logout failed`,
                    )
                  }
                />
              </ActionPanel.Section>
              <Action.OpenInBrowser
                title="Open in Browser"
                url="https://mail.tm/"
                icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                onOpen={() => showHUD("Login to view your account")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Messages">
        {Mails?.map((mail) => (
          <List.Item
            key={mail.id}
            title={mail.subject !== "" ? mail.subject : "No Subject"}
            icon={{ source: Icon.Message, tintColor: Color.Blue }}
            quickLook={{ path: `${environment.assetsPath}/${mail.id}.html`, name: mail.subject ?? "" }}
            accessories={[
              {
                icon: { source: Icon.Person, tintColor: Color.Green },
                tooltip: mail.from.name ?? mail.from.address ?? "",
              },
              {
                text: `${timeAgo(mail.createdAt)}`,
                icon: { source: Icon.Calendar, tintColor: Color.Blue },
                tooltip: new Date(mail.createdAt).toLocaleString(),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.ToggleQuickLook title="Quick Look" icon={{ source: Icon.Eye, tintColor: Color.Blue }} />
                <Action.Push
                  title="View Message"
                  target={<Message messageId={mail.id} />}
                  icon={{ source: Icon.Message, tintColor: Color.Blue }}
                />
                <Action
                  title="Delete Message"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() =>
                    handleAction(
                      () => deleteMail(mail.id),
                      () => setRefreshKey((prev) => prev + 1),
                      `Deleting Message...`,
                      `Message deleted`,
                      `Message could not be deleted`,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

// Message.tsx
function Message({ messageId }: { messageId: string }): JSX.Element {
  const fetchMessage = useCallback(() => getMessage(messageId), [messageId]);
  const { data: Message, isloading } = useAccount(fetchMessage);

  if (!Message) {
    return <></>;
  }

  const path = `${environment.assetsPath}/${messageId}.html`;

  const navigationTitle = Message?.subject || "No Subject";
  const markdownContent = Message?.html ? htmlToMarkdown(Message.html[0]) : "# No Content";

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={markdownContent}
      isLoading={isloading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={path}
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
          />
        </ActionPanel>
      }
    />
  );
}
