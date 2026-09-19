import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Fragment, type JSX, useState } from "react";

import { launchWithValues } from "../launch";
import { getPreferences } from "../preferences";
import { pushRecent } from "./recentLaunches";
import {
  buildExtraArgs,
  LAUNCH_OPTIONS_SCHEMA,
  type LaunchOptionsValues,
  type OptionField,
  schemaDefaults,
} from "./schema";

function renderField(field: OptionField, defaults: LaunchOptionsValues, index: number): JSX.Element {
  const lookup = defaults as unknown as Record<string, string | boolean>;

  switch (field.kind) {
    case "dropdown":
      return (
        <Form.Dropdown
          key={field.name}
          id={field.name}
          title={field.title}
          info={field.description}
          defaultValue={(lookup[field.name] as string) ?? field.default}
        >
          {field.options.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>
      );
    case "checkbox":
      return (
        <Form.Checkbox
          key={field.name}
          id={field.name}
          title={field.title}
          label={field.label}
          info={field.description}
          defaultValue={(lookup[field.name] as boolean) ?? field.default}
        />
      );
    case "textfield":
      return (
        <Form.TextField
          key={field.name}
          id={field.name}
          title={field.title}
          info={field.description}
          placeholder={field.placeholder}
          defaultValue={(lookup[field.name] as string) ?? field.default}
        />
      );
    case "separator": {
      const separatorKey = `separator-${index}-${field.title}`;
      return (
        <Fragment key={separatorKey}>
          {index > 0 && (
            <>
              <Form.Description text="" />
              <Form.Separator />
            </>
          )}
          <Form.Description text="" />
          <Form.Description title={field.title} text={field.description ?? ""} />
        </Fragment>
      );
    }
  }
}

type LaunchOptionsFormProps = {
  initialValues?: LaunchOptionsValues;
};

export default function LaunchOptionsForm(props: LaunchOptionsFormProps = {}): JSX.Element {
  const { pop } = useNavigation();
  const [formKey, setFormKey] = useState(0);
  const defaults = props.initialValues ?? schemaDefaults();

  async function handleSubmit(values: LaunchOptionsValues): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Launching…",
    });
    try {
      const launched = await launchWithValues(values);
      if (!launched) {
        toast.style = Toast.Style.Failure;
        toast.title = "Launch failed";
        return;
      }
      await pushRecent(values);
      toast.hide();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Launch failed" });
    }
  }

  async function handleCopyCommand(values: LaunchOptionsValues): Promise<void> {
    const preferences = getPreferences();
    const args = [`--user-data-dir=${preferences.tempBaseDir}/<id>`, ...buildExtraArgs(values)];
    const command = [shellQuote(preferences.binaryPath), ...args.map(shellQuote)].join(" ");
    await Clipboard.copy(command);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Chromium command",
      message: `${args.length} argument${args.length === 1 ? "" : "s"}`,
    });
  }

  function handleReset(): void {
    setFormKey((current) => current + 1);
    showToast({
      style: Toast.Style.Success,
      title: "Form reset to defaults",
    });
  }

  return (
    <Form
      key={formKey}
      navigationTitle="Launch with Options"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Launch" icon={Icon.Rocket} onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Copy Chromium Command"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
            onSubmit={handleCopyCommand}
          />
          <Action
            title="Reset to Defaults"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={handleReset}
          />
        </ActionPanel>
      }
    >
      {LAUNCH_OPTIONS_SCHEMA.map((field, index) => renderField(field, defaults, index))}
    </Form>
  );
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_\-./=:,@%+]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}
