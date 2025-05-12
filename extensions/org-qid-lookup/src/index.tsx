import { List, ActionPanel, CopyToClipboardAction } from "@raycast/api";

const organizations = {
  TEST: "123",
  TEST2: "456",
  TEST3: "789",
  TEST4: "101",
  TEST5: "102",
  TEST6: "103",
  TEST7: "104",
};

function Command() {
  return (
    <List searchBarPlaceholder="Search for organization name...">
      {Object.entries(organizations).map(([name, value]) => (
        <List.Item
          key={name}
          title={name}
          actions={
            <ActionPanel>
              <CopyToClipboardAction content={value} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

module.exports = Command;
