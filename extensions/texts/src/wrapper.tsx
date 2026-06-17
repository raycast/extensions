import { Action, ActionPanel, List } from "@raycast/api";

interface Props {
  variable: string;
  items?: JSX.Element[];
  provider: "Mail";
}

const Wrapper = (props: Props) => {
  const { items, variable, provider } = props;

  const resolveProvider = (provider: string) => {
    const tree = {
      Mail: "mailto:" + variable,
    };

    return tree[provider as keyof typeof tree];
  };

  return (
    <List>
      <List.Item
        subtitle={variable}
        title="Send message to"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Browser" url={resolveProvider(provider)} />
          </ActionPanel>
        }
      />

      {items || null}
    </List>
  );
};

export default Wrapper;
