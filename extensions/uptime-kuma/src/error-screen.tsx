import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import AuthForm from "./auth-form";

interface Props {
  title: string;
  message: string;
}

export function ErrorScreen({ title, message }: Props) {
  const error = `
# ${title}
${message} 
`;

  return (
    <Detail
      markdown={error}
      actions={
        <ActionPanel>
          <Action.Push title="Login" icon={Icon.Power} target={<AuthForm />} />
        </ActionPanel>
      }
    />
  );
}

export default ErrorScreen;
