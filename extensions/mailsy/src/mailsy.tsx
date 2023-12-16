import { useCallback, useEffect, useReducer, useState } from "react";
import { htmlToMarkdown, isLoggedIn, withToast } from "./libs/utils";
import { createAccount, deleteAccount, getAccount, getMails, deleteMail, getMessage } from "./libs/api";
import { Action, ActionPanel, Color, Detail, Icon, List, popToRoot, environment } from "@raycast/api";
import { useAccount } from "./hooks/useAccount";
import { Mail } from "./types";

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
              <Action.CopyToClipboard title="Copy Address" content={Account?.email ?? ""} />
              <Action
                title="Delete Account"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                onAction={() =>
                  withToast({
                    action: () => deleteAccount(),
                    onSuccess: () => {
                      popToRoot();
                      return "Account deleted successfully";
                    },
                    onFailure: () => "Account deletion failed",
                    loadingMessage: "Deleting account...",
                  })()
                }
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
            accessories={[
              {
                text: `${new Date(mail.createdAt).toLocaleString()}`,
                icon: { source: Icon.Calendar, tintColor: Color.Blue },
              },
              {
                icon: { source: Icon.Person },
                tooltip: mail.from.name ?? mail.from.address ?? "",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Message} title="View Message" target={<Message messageId={mail.id} />} />
                <Action
                  title="Delete Message"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  onAction={() =>
                    withToast({
                      action: () => deleteMail(mail.id),
                      onSuccess: () => {
                        setRefreshKey((key) => key + 1);
                        return "Mail deleted successfully";
                      },
                      onFailure: () => "Mail deletion failed",
                      loadingMessage: "Deleting mail...",
                    })()
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

  const path = `${environment.assetsPath}/email.html`;

  const navigationTitle = Message?.subject || "No Subject";
  const markdownContent = Message?.html ? htmlToMarkdown(Message.html[0]) : "# No Content";

  return (
    <Detail
      navigationTitle={navigationTitle}
      markdown={markdownContent}
      isLoading={isloading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={path} />
        </ActionPanel>
      }
    />
  );
}
