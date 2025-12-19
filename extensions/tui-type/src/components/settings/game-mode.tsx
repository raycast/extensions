import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Mode } from "../../types";
import { QUOTE_GROUPS } from "../../constants";

export function ModeSettingsForm({
  currentMode,
  currentLimit,
  includePunctuation,
  includeNumbers,
  onSave,
}: {
  currentMode: Mode;
  currentLimit: number;
  includePunctuation: boolean;
  includeNumbers: boolean;
  onSave: (m: Mode, l: number, p: boolean, n: boolean) => void;
}) {
  const { pop } = useNavigation();

  const [mode, setMode] = useState<Mode>(currentMode);
  const [limit, setLimit] = useState<string>(currentLimit.toString());
  const [punct, setPunct] = useState<boolean>(includePunctuation);
  const [nums, setNums] = useState<boolean>(includeNumbers);

  const handleSave = (
    newMode: Mode,
    newLimit: string,
    newPunct: boolean,
    newNums: boolean,
  ) => {
    setMode(newMode);
    setLimit(newLimit);
    setPunct(newPunct);
    setNums(newNums);

    onSave(newMode, parseInt(newLimit), newPunct, newNums);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Done" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Game Mode"
        value={mode}
        onChange={(val) => handleSave(val as Mode, limit, punct, nums)}
      >
        <Form.Dropdown.Item
          value="time"
          title="Time (Seconds)"
          icon={Icon.Stopwatch}
        />
        <Form.Dropdown.Item value="words" title="Word Count" icon={Icon.Text} />
        <Form.Dropdown.Item
          value="quote"
          title="Quote"
          icon={Icon.QuoteBlock}
        />
      </Form.Dropdown>

      {mode === "time" && (
        <Form.Dropdown
          id="limit_time"
          title="Duration"
          value={limit}
          onChange={(val) => handleSave(mode, val, punct, nums)}
        >
          {[15, 30, 60, 120].map((val) => (
            <Form.Dropdown.Item
              key={val}
              value={val.toString()}
              title={`${val} Seconds`}
            />
          ))}
        </Form.Dropdown>
      )}

      {mode === "words" && (
        <Form.Dropdown
          id="limit_words"
          title="Word Count"
          value={limit}
          onChange={(val) => handleSave(mode, val, punct, nums)}
        >
          {[10, 25, 50, 100].map((val) => (
            <Form.Dropdown.Item
              key={val}
              value={val.toString()}
              title={`${val} Words`}
            />
          ))}
        </Form.Dropdown>
      )}

      {mode === "quote" && (
        <Form.Dropdown
          id="limit_quote"
          title="Quote Length"
          value={limit}
          onChange={(val) => handleSave(mode, val, punct, nums)}
        >
          {QUOTE_GROUPS.map((grp) => (
            <Form.Dropdown.Item
              key={grp.id}
              value={grp.id.toString()}
              title={`${grp.label} (${grp.min}-${grp.max} chars)`}
            />
          ))}
        </Form.Dropdown>
      )}

      {/* NEW: Toggles for Punctuation and Numbers */}
      {mode !== "quote" && (
        <>
          <Form.Separator />
          <Form.Description text="Complexity Modifiers" />
          <Form.Checkbox
            id="punctuation"
            label="Include Punctuation"
            value={punct}
            onChange={(val) => handleSave(mode, limit, val, nums)}
          />
          <Form.Checkbox
            id="numbers"
            label="Include Numbers"
            value={nums}
            onChange={(val) => handleSave(mode, limit, punct, val)}
          />
        </>
      )}
    </Form>
  );
}
