import { Action, ActionPanel, List } from "@raycast/api";

const bigO = [
  { complexity: "O(1)", rank: "Best - Constant time" },
  { complexity: "O(log n)", rank: "Excellent - Logarithmic time" },
  { complexity: "O(n)", rank: "Good - Linear time" },
  { complexity: "O(n log n)", rank: "Fair - Linearithmic time" },
  { complexity: "O(n^2)", rank: "Bad - Quadratic time" },
  { complexity: "O(2^n)", rank: "Horrible - Exponential time" },
  { complexity: "O(n!)", rank: "Yikes! - Factorial time" },
];

export default function Command() {
  return (
    <List navigationTitle="Big-O Cheat Sheet">
      {bigO.map((item) => (
        <List.Item
          key={item.complexity}
          title={item.complexity.padEnd(10, " ")}
          subtitle={item.rank}
          actions={
            <ActionPanel title={item.complexity}>
              <Action.CopyToClipboard title="Copy" content={item.complexity} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
