import { Color, Icon, LaunchProps, List } from "@raycast/api";
import { usePwnedPassword } from "./hooks/use-pwned-password";
import { PasswordResult } from "./components/password-result";
import { HibpActions } from "./components/hibp-actions";

interface CommandArguments {
  password: string;
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { password } = props.arguments;
  const { count, isLoading, errorText } = usePwnedPassword(password);

  if (errorText) {
    return (
      <List>
        <List.EmptyView
          title="An error occurred"
          description={errorText}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={<HibpActions />}
        />
      </List>
    );
  }

  return <PasswordResult count={count} isLoading={isLoading} />;
}
