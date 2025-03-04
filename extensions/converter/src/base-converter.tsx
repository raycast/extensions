import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";
import { BaseConvertersAdvanceView } from "./components/base-converters-advance-view";
import { BaseConvertersSimpleView } from "./components/base-converters-simple-view";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { advanceView, advanceViewLocation } from "./types/preferences";
import useBaseConverter from "./hooks/use-base-converter";

export default function BaseConverter() {
  const converter = useBaseConverter();

  const [focused, setFocused] = useState({ base: 10, id: 0 });
  const focusedValue = converter.get(focused.base, focused.id);

  const advancedInputBaseState = useState(10);
  const [advancedOutputBase, setAdvancedOutputBase] = useState(2);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title={`Copy Base ${focused.base}`}
            content={focusedValue}
            // shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.CopyToClipboard
            title="Copy Base 10"
            content={converter.get(10)}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Base 2"
              content={converter.get(2)}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action.CopyToClipboard
              title="Copy Base 4"
              content={converter.get(4)}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            <Action.CopyToClipboard
              title="Copy Base 8"
              content={converter.get(8)}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
            />
            <Action.CopyToClipboard
              title="Copy Base 16"
              content={converter.get(16)}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
            <Action.CopyToClipboard
              title="Copy Base 32"
              content={converter.get(32)}
              shortcut={{ modifiers: ["cmd"], key: "6" }}
            />
            {advanceView && (
              <Action.CopyToClipboard
                title="Copy Output"
                content={converter.get(advancedOutputBase, 1)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title="Clear All"
              shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
              onAction={converter.reset}
            />
          </ActionPanel.Section>
          <ActionOpenPreferences showCommandPreferences={true} showExtensionPreferences={true} />
        </ActionPanel>
      }
    >
      <ConditionalView
        show={advanceView}
        reverseOrder={advanceViewLocation === "Top"}
        first={
          <BaseConvertersSimpleView converter={converter} inputRefs={converter.ref} setFocused={setFocused} key={1} />
        }
        second={
          <BaseConvertersAdvanceView
            converter={converter}
            fromBaseState={advancedInputBaseState}
            toBaseState={[advancedOutputBase, setAdvancedOutputBase]}
            setFocused={setFocused}
            key={2}
          />
        }
      />
    </Form>
  );
}

function ConditionalView({
  show,
  reverseOrder,
  first,
  second,
}: {
  show: boolean;
  reverseOrder: boolean;
  first: JSX.Element;
  second: JSX.Element;
}) {
  if (!show) return first;
  return reverseOrder ? [second, <Form.Separator key={0} />, first] : [first, <Form.Separator key={0} />, second];
}
