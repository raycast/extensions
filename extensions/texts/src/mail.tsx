import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import Wrapper from "./wrapper";

interface Props {
  address: string;
}

const actions = [
  {
    title: "Send by Gmail",
    action: "https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=",
  },
  {
    title: "Send by Outlook",
    action: "https://outlook.live.com/owa/?path=/mail/action/compose&to=",
  },
  {
    title: "Send by Yahoo",
    action: "https://compose.mail.yahoo.com/?to=",
  },
  {
    title: "Send by Yandex",
    action: "https://mail.yandex.com/compose?to=",
  },
  {
    title: "Send by AOL",
    action: "https://mail.aol.com/webmail-std/en-us/suite#/mail/compose-message?to=",
  },
  {
    title: "Send by Zoho",
    action: "https://mail.zoho.com/mail/addressexists.do?to=",
  },
  {
    title: "Send by Mail.com",
    action: "https://mail.com/mail/addressexists.do?to=",
  },
  {
    title: "Send by ProtonMail",
    action: "https://mail.protonmail.com/compose?to=",
  },
  {
    title: "Send by iCloud",
    action: "https://www.icloud.com/#mail?to=",
  },
];

const Email = (props: LaunchProps<{ arguments: Props }>) => {
  const { address } = props.arguments;

  const items = actions.map((action) => (
    <List.Item
      subtitle={address}
      key={action.title}
      title={action.title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={action.action + address} />
        </ActionPanel>
      }
    />
  ));

  return <Wrapper provider="Mail" variable={address} items={items} />;
};

export default Email;
