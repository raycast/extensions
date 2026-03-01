import { Action, ActionPanel, Clipboard, Form, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { execFileSync } from "node:child_process";
import { useEffect, useState } from "react";

import { Item } from "../types";
import { getCliPath } from "../utils";

import Shortcut = Keyboard.Shortcut;
import Style = Toast.Style;

type RandomPasswordProps = {
  length: string;
  numbers: boolean;
  symbols: boolean;
};

export function RandomPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<null | string>(null);
  const { handleSubmit, itemProps, values } = useForm<RandomPasswordProps>({
    initialValues: {
      length: "12",
      numbers: true,
      symbols: true,
    },
    onSubmit: async (values) => {
      setIsLoading(true);
      setGeneratedPassword(null);
      const toast = await showToast(Style.Animated, "Generating password...", "Please wait a moment");
      const args = ["letters", values.length];

      if (values.numbers) args.push("digits");
      if (values.symbols) args.push("symbols");

      try {
        // https://1password.community/discussion/139189/feature-request-generate-random-passwords-with-cli-via-dedicated-command-e-g-op-generate
        const stdout = execFileSync(getCliPath(), [
          "item",
          "create",
          "--dry-run",
          "--category",
          "Password",
          `--generate-password=${args.join(",")}`,
          "--format",
          "json",
        ]);
        const item: Item = JSON.parse(stdout.toString());
        const password = item.fields
          ?.filter((field) => field.id === "password")
          .filter(Boolean)
          .map((v) => v.value)
          .at(0);

        setGeneratedPassword(password || "ERROR");
        await Clipboard.copy(password || "", { concealed: true });
        toast.style = Style.Success;
        toast.title = "Copied to clipboard!";
        toast.message = "";
      } catch (e) {
        toast.style = Style.Failure;
        toast.title = "Failed to generate password";
        if (e instanceof Error) {
          toast.message = e.message;
          toast.primaryAction = {
            onAction: async (toast) => {
              await Clipboard.copy((e as Error).message);
              await toast.hide();
            },
            title: "Copy logs",
          };
        }
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      length: (value) => {
        if (value && isNaN(parseInt(value))) {
          return "Must be a number";
        }

        if (value && (parseInt(value) < 4 || parseInt(value) > 64)) {
          return "Password length must be between 5 and 64 characters";
        } else if (!value) {
          return "The item is required";
        }
      },
    },
  });

  useEffect(() => {
    handleSubmit(values);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Key}
            onSubmit={handleSubmit}
            shortcut={Shortcut.Common.Refresh}
            title={"Regenerate Password"}
          />
          {generatedPassword && (
            <Action.CopyToClipboard
              concealed={true}
              content={generatedPassword || ""}
              icon={Icon.Clipboard}
              shortcut={Shortcut.Common.Copy}
            />
          )}
        </ActionPanel>
      }
      isLoading={isLoading}
      navigationTitle={"Customize your password"}
    >
      <Form.Description text={`${generatedPassword || "Generating..."}\n\n\n`} title={"🔑 Password"} />

      <Form.Separator />
      <Form.TextField title="Characters" {...itemProps.length} />
      <Form.Checkbox label={"0123456789"} title="Numbers" {...itemProps.numbers} />
      <Form.Checkbox label={"!@.-_*"} title="Symbols" {...itemProps.symbols} />
    </Form>
  );
}
