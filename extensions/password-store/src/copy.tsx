import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Clipboard } from "@raycast/api";
import { Password } from "./password";
import { getPasswords } from "./passwords";
import { gitPush } from "./git";

export default function Command() {
  const { data, isLoading } = usePromise(getPasswords);

  return (
    <List isLoading={isLoading}>
      {data?.map((item, index) => (
        <PasswordListItem key={item.path} item={item} index={index} />
      ))}
    </List>
  );
}

function PasswordListItem(props: { item: Password; index: number }) {
  return (
    <List.Item
      title={props.item.name!}
      subtitle={props.item.path}
      keywords={props.item.path!.split("/")}
      actions={<Actions item={props.item} />}
    />
  );
}

function Actions(props: { item: Password }) {
  return (
    <ActionPanel title={props.item.name}>
      <ActionPanel.Section>
        {props.item.name && (
          <Action
            title="Copy Password"
            onAction={async () => {
              await props.item.copyPassword();
              await showHUD("Copied Password");
              const preferences = getPreferenceValues<Preferences>();
              if (!preferences["password-clear"]) {
                return;
              }
              const clearTimeout =
                Number(preferences["password-clear-timer"]) * 1000;
              await new Promise((f) => setTimeout(f, clearTimeout));
              await Clipboard.clear();
              await showHUD("Clipboard cleared");
            }}
          />
        )}
        <Action title="Edit Password" />
      </ActionPanel.Section>
      <ActionPanel.Section title="Git">
        <Action
          title="Git Push"
          onAction={async () => {
            await gitPush();
          }}
        />
        <Action title="Git Pull" />
      </ActionPanel.Section>
      <ActionPanel.Section title="Preferences">
        <Action
          title="Open Extension Preferences"
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
