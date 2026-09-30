import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import AuthForm from "./auth-form";
import { useCachedState } from "@raycast/utils";

interface Props {
  title: string;
  message: string;
}

export function ErrorScreen({ title, message }: Props) {
  const error = `
# ${title}
${message} 
`;
  const [kuma_url, setKumaUrl] = useCachedState<string>("kuma-url", "");

  return (
    <Detail
      markdown={error}
      actions={
        <ActionPanel>
          <Action.Push title="Login" icon={Icon.Power} target={<AuthForm onSave={setKumaUrl} />} />
        </ActionPanel>
      }
    />
  );
}

export default ErrorScreen;
