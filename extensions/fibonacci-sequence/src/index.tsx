import { ActionPanel, Action, List } from "@raycast/api";

const fibonacci = (n: number) => {
  let n1 = 1,
    n2 = 1,
    nextTerm;
  const a: Array<number> = [];

  for (let i = 1; i <= n; i++) {
    a.push(n1);
    nextTerm = n1 + n2;
    n1 = n2;
    n2 = nextTerm;
  }

  return [...new Set(a)];
};

const items = () => {
  return fibonacci(16).map((i) => {
    return {
      id: i,
      title: i,
    };
  });
};

export default function Command() {
  return (
    <List>
      {items().map((item) => (
        <List.Item
          key={item.id}
          icon="list-icon.png"
          title={`${item.title}`}
          actions={
            <ActionPanel title="Actions">
              <Action.CopyToClipboard content={item.title} />
              <Action.Paste content={item.title} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
