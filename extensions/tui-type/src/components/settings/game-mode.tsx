import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { Mode } from "../../types";
import { QUOTE_GROUPS } from "../../constants";
import { useSettingsStore } from "../../hooks/store/settings/useSettings";

export function ModeSettingsForm() {
  const { pop } = useNavigation();

  const {
    mode,
    setMode,
    limit,
    setLimit,
    usePunctuation,
    setUsePunctuation,
    useNumbers,
    setUseNumbers,
  } = useSettingsStore();

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
        onChange={(val) => setMode(val as Mode)}
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
          value={`${limit}`}
          onChange={(val) => setLimit(+val)}
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
          value={`${limit}`}
          onChange={(val) => setLimit(+val)}
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
          value={`${limit}`}
          onChange={(val) => setLimit(+val)}
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
            value={usePunctuation}
            onChange={(val) => setUsePunctuation(val)}
          />
          <Form.Checkbox
            id="numbers"
            label="Include Numbers"
            value={useNumbers}
            onChange={(val) => setUseNumbers(val)}
          />
        </>
      )}
    </Form>
  );
}
