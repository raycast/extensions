import { List, Clipboard, ActionPanel, Action, Form, showToast, Toast, Keyboard, Icon } from "@raycast/api";
import { useEffect, useState } from "react";

type AvailableActions = "+" | "*" | "Average" | "custom";

const actions = {
  "+": [(a: number, b: number) => a + b],
  "*": [(a: number, b: number) => a * b],
  Average: [(a: number, b: number) => a + b, (r1: number, count: number) => r1 / count],
  custom: null,
};

const ActionView = ({ items }: { items: Clipboard.ReadContent[] }) => {
  const [selectedAction, setSelectedAction] = useState<AvailableActions>("+");
  const [customAction, setCustomAction] = useState<string>("");
  const [isStrings, setIsStrings] = useState<boolean>(false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Perform Action"
            icon={Icon.Calculator}
            onAction={async () => {
              let result: number | string | undefined = undefined;
              const first: number | string = isStrings ? items[0].text : Number(items[0].text);
              let rest: (number | string)[] = [];

              try {
                rest = items.slice(1).map((item) => {
                  if (!isStrings) {
                    const number = Number(item.text);
                    if (isNaN(number)) {
                      throw new Error("Invalid number");
                    }
                    return number;
                  }
                  return item.text;
                });
              } catch (error) {
                await showToast({ title: "Error parsing numbers", style: Toast.Style.Failure });
                return;
              }

              try {
                console.log(first);
                console.log(rest);
                result = rest.reduce(actions[selectedAction]?.[0] || eval(`(${customAction})`), first);

                if (actions[selectedAction]?.[1]) {
                  result = actions[selectedAction]![1](result as number, items.length);
                }
              } catch (error) {
                await showToast({
                  title: "Error performing action",
                  style: Toast.Style.Failure,
                });
                return;
              }

              console.log("Result", result);
              Clipboard.copy(result);
              await showToast({ title: "Result Copied to Clipboard", message: String(result) });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="action"
        title="Action"
        value={selectedAction}
        onChange={(value) => {
          setSelectedAction(value as AvailableActions);
          if (value !== "custom") setIsStrings(false);
        }}
      >
        <Form.Dropdown.Item value="+" title="Add (+)" />
        <Form.Dropdown.Item value="*" title="Multiply (×)" />
        <Form.Dropdown.Item value="Average" title="Average" />
        <Form.Dropdown.Item value="custom" title="Custom Action" />
      </Form.Dropdown>
      {selectedAction === "custom" && (
        <>
          <Form.TextField
            id="custom-action"
            title="Custom Action (JS)"
            placeholder="Enter a valid JS reducer function (e.g. (a, b) => a + b)"
            value={customAction}
            onChange={(value) => setCustomAction(value)}
          />
          <Form.Checkbox
            id="is-strings"
            label="Are these strings?"
            value={isStrings}
            onChange={(value) => setIsStrings(value)}
          />
        </>
      )}
    </Form>
  );
};

export default function Command() {
  const [clipboardItems, setClipboardItems] = useState<Clipboard.ReadContent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchClipboardItems = async () => {
      const initialItems: Clipboard.ReadContent[] = await Promise.all(
        [0, 1, 2, 3, 4, 5].map(async (index) => {
          return await Clipboard.read({ offset: index });
        }),
      );
      setClipboardItems(initialItems);
      setIsLoading(false);
    };

    fetchClipboardItems();
  }, []);

  return (
    <List searchBarPlaceholder="Search Clipboard Items" isLoading={isLoading}>
      {clipboardItems.map((item, index) => (
        <List.Item
          key={index}
          title={item.text ?? "Empty: Probably a File"}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Up To This Item"
                icon={Icon.ArrowUp}
                target={<ActionView items={clipboardItems.slice(0, index + 1)} />}
              />
              <Action
                title="Remove from List"
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                icon={Icon.Trash}
                onAction={async () => {
                  setClipboardItems((items) => items.filter((_, i) => i !== index));
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
