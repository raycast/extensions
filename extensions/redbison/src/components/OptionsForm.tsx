import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  choiceTitle,
  optionInfo,
  optionLabel,
  optionPlaceholder,
  optionsFromForm,
  UtilityError,
  type Options,
  type ToolOption,
  type Utility,
} from "../lib/utilities";
import type { Input } from "../lib/input";
import { ResultView } from "./ResultView";

const INPUT_FIELD = "__input";

/** The option as a form field: a dropdown for a closed set, a checkbox for a switch, text otherwise. */
function OptionField({ option: o, value }: { option: ToolOption; value: Options[string] | undefined }) {
  const title = optionLabel(o) + (o.required ? " (required)" : "");
  // The CLI's descriptions are British English; optionInfo respells them for the store.
  const info = optionInfo(o);

  if (o.values?.length) {
    // A required choice with no default starts unchosen, so the tool is never
    // run with a platform or type the user did not pick.
    const initial = String(value ?? o.defaultValue ?? "");
    return (
      <Form.Dropdown id={o.key} title={title} info={info} defaultValue={initial}>
        {initial === "" ? <Form.Dropdown.Item value="" title="Choose…" /> : null}
        {o.values.map((v) => (
          <Form.Dropdown.Item key={v.value} value={v.value} title={choiceTitle(v)} />
        ))}
      </Form.Dropdown>
    );
  }
  if (o.type === "boolean") {
    return (
      <Form.Checkbox id={o.key} title={title} label={info} defaultValue={Boolean(value ?? o.defaultValue ?? false)} />
    );
  }
  const placeholder = optionPlaceholder(o);
  if (o.isText) {
    return (
      <Form.TextArea
        id={o.key}
        title={title}
        info={info}
        placeholder={placeholder}
        defaultValue={value === undefined ? "" : String(value)}
      />
    );
  }
  return (
    <Form.TextField
      id={o.key}
      title={title}
      info={info}
      placeholder={placeholder}
      defaultValue={value === undefined ? "" : String(value)}
    />
  );
}

export function OptionsForm({
  utility: u,
  input,
  initialOptions = {},
}: {
  utility: Utility;
  input: Input;
  initialOptions?: Options;
}) {
  const { push } = useNavigation();

  async function submit(values: Record<string, unknown>) {
    let options: Options;
    try {
      options = optionsFromForm(u.id, values);
    } catch (e) {
      if (e instanceof UtilityError) {
        await showFailureToast(e, { title: "Check the Options" });
        return;
      }
      throw e;
    }
    const missing = u.required.filter((o) => options[o.key] === undefined);
    if (missing.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Fill in ${missing.map(optionLabel).join(", ")}`,
      });
      return;
    }
    const text = u.generates ? "" : String(values[INPUT_FIELD] ?? "");
    if (!u.generates && !text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add Some Input",
        message: `${u.title} needs text to work on.`,
      });
      return;
    }
    const changed = !u.generates && text !== input.text;
    push(<ResultView utility={u} input={{ text, source: changed ? "Form" : input.source }} options={options} />);
  }

  return (
    <Form
      navigationTitle={u.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={u.generates ? "Generate" : "Run"} icon={Icon.Play} onSubmit={submit} />
          <Action.OpenInBrowser title="Open on RedBison" url={u.url} />
        </ActionPanel>
      }
    >
      <Form.Description title={u.title} text={u.summary} />
      {u.generates ? null : (
        <Form.TextArea
          id={INPUT_FIELD}
          title="Input"
          placeholder="Paste or type the text to work on"
          defaultValue={input.text}
        />
      )}
      {u.options.length ? <Form.Separator /> : null}
      {u.options.map((o) => (
        <OptionField key={o.key} option={o} value={initialOptions[o.key]} />
      ))}
    </Form>
  );
}
