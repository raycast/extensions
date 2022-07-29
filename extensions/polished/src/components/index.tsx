import { List, ActionPanel, CopyToClipboardAction, Icon } from "@raycast/api";

type ResultsProps = {
  input: string;
  [key: string]: string | undefined;
};

export function Results(props: ResultsProps) {
  const { input, ...rest } = props;
  const entries = Object.entries(rest);

  if (!entries) {
    return (
      <List>
        <List.Item key="error" title="No result" />
      </List>
    );
  }

  return (
    <List navigationTitle={`Input: ${input}`}>
      <List.Section title="Output">
        {entries.map((value) => {
          if (value[1]) {
            return (
              <List.Item
                key={value[0]}
                accessoryTitle={value[0]}
                title={value[1]}
                icon={{ source: Icon.Circle, tintColor: value[1] }}
                actions={
                  <ActionPanel>
                    <CopyToClipboardAction title="Copy to Clipboard" content={value[1]} />
                  </ActionPanel>
                }
              />
            );
          }
          return null;
        })}
      </List.Section>
    </List>
  );
}
