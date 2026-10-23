import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { convertQuery, formatQuantity, type StackSize } from "./conversion";

type CommandProps = LaunchProps<{ arguments: { query?: string } }>;

export default function Command(props: CommandProps) {
  const [query, setQuery] = useState(
    props.arguments.query || props.fallbackText || "",
  );
  const {
    value: storedStackSize,
    setValue: setStackSize,
    isLoading,
  } = useLocalStorage<StackSize>("stack-size", 64);
  // Storage writes revalidate in the background. Keep the loaded UI mounted:
  // remounting the dropdown can emit its current selection and start another write.
  const isInitializing = isLoading && storedStackSize === undefined;
  const stackSize: StackSize = storedStackSize === 16 ? 16 : 64;
  const conversion = convertQuery(query, stackSize);

  return (
    <List
      searchBarPlaceholder="144 to stacks or 1.5 stacks to items"
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      isLoading={isInitializing}
      searchBarAccessory={
        !isInitializing ? (
          <List.Dropdown
            tooltip="Items per stack, remembered for both directions"
            value={String(stackSize)}
            onChange={(value) => {
              const nextSize = value === "16" ? 16 : 64;
              if (nextSize !== stackSize) return setStackSize(nextSize);
            }}
          >
            <List.Dropdown.Item title="64 items / stack" value="64" />
            <List.Dropdown.Item title="16 items / stack" value="16" />
          </List.Dropdown>
        ) : undefined
      }
    >
      {isInitializing ? (
        <List.EmptyView title="Loading stack size…" />
      ) : conversion.status === "success" ? (
        <List.Item
          id="result"
          icon="icon.png"
          title={conversion.result}
          subtitle={
            conversion.direction === "items-to-stacks"
              ? formatQuantity(conversion.items, "item")
              : "Stacks → items"
          }
          accessories={[{ text: `${stackSize} items / stack` }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Result"
                content={conversion.result}
              />
            </ActionPanel>
          }
        />
      ) : conversion.status === "error" ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Check your quantity"
          description={conversion.message}
        />
      ) : (
        <List.EmptyView
          icon="icon.png"
          title="Items ↔ stacks"
          description={
            'Try "144 to stacks", "1.5 stacks to items", or "2 stacks and 16 items". Enter copies the result.'
          }
        />
      )}
    </List>
  );
}
