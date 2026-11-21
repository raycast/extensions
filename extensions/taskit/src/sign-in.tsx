import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { messageFrom, signIn } from "./auth";

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon="icon.png"
        title="Sign in to Taskit"
        description="Opens Taskit in your browser. Use the account you already have."
        actions={
          <ActionPanel>
            <Action
              title="Sign in to Taskit"
              icon={Icon.Person}
              onAction={async () => {
                try {
                  await signIn();
                  onSignedIn();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Couldn't sign in",
                    message: messageFrom(error),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
