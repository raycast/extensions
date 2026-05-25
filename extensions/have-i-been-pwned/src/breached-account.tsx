import { Color, Icon, LaunchProps, List } from "@raycast/api";
import { useBreachedAccount } from "./hooks/use-breached-account";
import { BreachList } from "./components/breach-list";
import { HibpActions } from "./components/hibp-actions";

export default function Command(props: LaunchProps<{ arguments: Arguments.BreachedAccount }>) {
  const { email } = props.arguments;
  const { breaches, isLoading, errorText, needsApiKey } = useBreachedAccount(email);

  if (errorText) {
    return (
      <List>
        <List.EmptyView
          title={needsApiKey ? "API Key Required" : "An error occurred"}
          description={needsApiKey ? "Add your HIBP API key in preferences to check email breaches." : errorText}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={<HibpActions needsApiKey={needsApiKey} />}
        />
      </List>
    );
  }

  if (!isLoading && breaches !== null && breaches.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="Good News!"
          description={`No breaches found for ${email}`}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          actions={<HibpActions />}
        />
      </List>
    );
  }

  return <BreachList breaches={breaches ?? []} isLoading={isLoading} subtitle={email} />;
}
