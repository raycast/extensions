import { ActionPanel, Action, List, Icon, Color, useNavigation } from "@raycast/api";
import { EmailListView } from "./components/EmailListView";
import { CustomizeEmailForm } from "./components/CustomizeEmailForm";
import { handleQuickGenerate } from "./actions/emailActions";
import { UI_STRINGS, URLS } from "./constants";

export default function Command() {
  const { push } = useNavigation();

  function handleViewEmails() {
    push(<EmailListView />);
  }

  function handleCustomize() {
    push(<CustomizeEmailForm />);
  }

  return (
    <List>
      <List.Item
        title={UI_STRINGS.QUICK_GENERATE_TITLE}
        subtitle={UI_STRINGS.QUICK_GENERATE_DESCRIPTION}
        icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
        actions={
          <ActionPanel>
            <Action title={UI_STRINGS.GENERATE} onAction={handleQuickGenerate} />
            <Action.OpenInBrowser
              title={UI_STRINGS.VISIT_MAIL_TM}
              url={URLS.MAIL_TM}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title={UI_STRINGS.CUSTOMIZE_EMAIL_TITLE}
        subtitle={UI_STRINGS.CUSTOMIZE_EMAIL_DESCRIPTION}
        icon={{ source: Icon.Pencil, tintColor: Color.Blue }}
        actions={
          <ActionPanel>
            <Action title={UI_STRINGS.CUSTOMIZE} onAction={handleCustomize} />
            <Action.OpenInBrowser
              title={UI_STRINGS.VISIT_MAIL_TM}
              url={URLS.MAIL_TM}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title={UI_STRINGS.VIEW_SAVED_EMAILS_TITLE}
        subtitle={UI_STRINGS.VIEW_SAVED_EMAILS_DESCRIPTION}
        icon={{ source: Icon.Envelope, tintColor: Color.Green }}
        actions={
          <ActionPanel>
            <Action title={UI_STRINGS.VIEW} onAction={handleViewEmails} />
            <Action.OpenInBrowser
              title={UI_STRINGS.VISIT_MAIL_TM}
              url={URLS.MAIL_TM}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
