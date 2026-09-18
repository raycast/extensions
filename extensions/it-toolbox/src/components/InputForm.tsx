import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { ResultList, ResultRow } from "./ResultList";

interface InputFormProps {
  /** Title of the multi-line input, e.g. "Text to encode" */
  inputTitle: string;
  placeholder?: string;
  /** Initial text */
  initialValue?: string;
  /**
   * Extra form fields (dropdowns, checkboxes, …). For their values to take part in the
   * computation, write them back into the form state with setValue(key, value).
   */
  extraFields?: (args: { values: Record<string, string>; setValue: (key: string, value: string) => void }) => ReactNode;
  /** Result rows computed from the input and the form fields */
  compute: (values: Record<string, string>) => ResultRow[] | null;
  /**
   * Live values: results computed with no input at all (the Timestamp command uses this to
   * show the current time). When set, the form gets an extra action to open them.
   */
  defaults?: (values: Record<string, string>) => ResultRow[];
  /** Search bar placeholder for the live values page */
  defaultsSearchBarPlaceholder?: string;
  /** Section heading for the live values page */
  defaultsSectionTitle?: string;
}

/**
 * Shared "input → results" form: submit with ⏎, then the current form values are computed
 * and pushed onto a result page. Result pages all support ⏎ to copy, so every command feels
 * the same.
 *
 * Commands that configure `defaults` (Timestamp) also get a live values entry, so the user
 * can see the current time / timestamp without typing anything first.
 */
export function InputForm({
  inputTitle,
  placeholder,
  initialValue,
  extraFields,
  compute,
  defaults,
  defaultsSearchBarPlaceholder,
  defaultsSectionTitle,
}: InputFormProps) {
  const { push } = useNavigation();
  const [values, setValues] = useState<Record<string, string>>({ input: initialValue ?? "" });
  const [defaultsTick, setDefaultsTick] = useState(0);

  const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  // Live values = compute() called with an empty input; fall back to defaults() so both
  // paths render through exactly the same code.
  const defaultRows = useMemo(() => {
    void defaultsTick;
    if (!defaults) return [];
    const fromCompute = compute({ ...values, input: "" });
    if (fromCompute && fromCompute.length) return fromCompute;
    return defaults(values);
  }, [compute, defaults, values, defaultsTick]);

  const showDefaults = useCallback(
    () =>
      push(
        <ResultList
          sectionTitle={defaultsSectionTitle ?? "Live Values"}
          searchBarPlaceholder={defaultsSearchBarPlaceholder ?? "Filter results…"}
          rows={defaultRows}
        />,
      ),
    [push, defaultRows, defaultsSearchBarPlaceholder, defaultsSectionTitle],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Results"
            icon={Icon.ArrowRight}
            onSubmit={() => {
              const rows = compute(values);
              if (rows === null) return;
              push(<ResultList sectionTitle="Results" rows={rows} />);
            }}
          />
          {defaults ? (
            <Action
              title="Show Live Values"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={showDefaults}
            />
          ) : null}
          {defaults ? (
            <Action
              title="Refresh Live Values"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => {
                setDefaultsTick((t) => t + 1);
                showDefaults();
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      {extraFields ? extraFields({ values, setValue }) : null}
      <Form.TextArea
        id="input"
        title={inputTitle}
        placeholder={placeholder ?? "Paste or type a value"}
        defaultValue={initialValue ?? ""}
        onChange={(value) => setValue("input", value)}
        enableMarkdown={false}
      />
    </Form>
  );
}
