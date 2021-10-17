import { ActionPanel, copyTextToClipboard, Form, popToRoot, showHUD, SubmitFormAction } from "@raycast/api";
import execa from "execa";
import { Fragment, useState } from "react";
import { TroubleshootingGuide } from "./components";
import { checkCliPath, getWorkflowEnv } from "./utils";

function range(start: number, stop: number) {
  return Array.from({ length: stop - start }, (_, i) => start + i);
}

interface FormValues {
  type: "password" | "passphrase";
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  length: string;
  words: string;
  separator: string;
}

export default function PasswordGenerator(): JSX.Element {
  if (!checkCliPath()) {
    return <TroubleshootingGuide />;
  }

  const [type, setType] = useState("password");
  async function generatePassword(values: FormValues) {
    const cmd_args = ["generate"];
    if (values.type == "password") {
      const boolean_flags = ["uppercase", "lowercase", "number", "special"] as (keyof FormValues)[];
      for (const boolean_flag of boolean_flags) {
        if (values[boolean_flag]) {
          cmd_args.push(`--${boolean_flag}`);
        }
      }
      cmd_args.push("--length", values.length);
    } else {
      cmd_args.push("--passphrase");
      cmd_args.push("--words", values.words);
      cmd_args.push("--separator", values.separator);
    }

    console.log(cmd_args);
    const { stdout: password } = await execa("bw", cmd_args, { env: getWorkflowEnv() });
    return password;
  }
  async function copyPasswordToClipboard(values: FormValues) {
    const password = await generatePassword(values);
    await copyTextToClipboard(password);
    showHUD("Password Copied to Clipboard!");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Generate Password" onSubmit={copyPasswordToClipboard} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" id="type" value={type} onChange={setType}>
        <Form.Dropdown.Item title="password" value="password" />
        <Form.Dropdown.Item title="passphrase" value="passphrase" />
      </Form.Dropdown>
      <Form.Separator />
      {type == "password" ? (
        <Fragment>
          <Form.Checkbox id="uppercase" label="Include uppercase characters." defaultValue={true} title="A-Z" />
          <Form.Checkbox id="lowercase" label="Include lowercase characters." defaultValue={true} title="a-z" />
          <Form.Checkbox id="number" label="Include numeric characters." defaultValue={true} title="0-9" />
          <Form.Checkbox id="special" label="Include special characters." defaultValue={false} title="!@#$%^&*" />
          <Form.Dropdown id="length" defaultValue="14" title="Length of the password.">
            {range(5, 100).map((index) => (
              <Form.DropdownItem key={index} value={index.toString()} title={index.toString()} />
            ))}
          </Form.Dropdown>
        </Fragment>
      ) : (
        <Fragment>
          <Form.Dropdown id="words" defaultValue={"5"} title="Number of words.">
            {range(3, 10).map((index) => (
              <Form.DropdownItem key={index} value={index.toString()} title={index.toString()} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown id="separator" defaultValue="-" title="Number of words.">
            {range(32, 127)
              .map((index) => (index == 32 ? "space" : String.fromCharCode(index)))
              .map((char) => (
                <Form.DropdownItem key={char} value={char} title={char} />
              ))}
          </Form.Dropdown>
        </Fragment>
      )}
    </Form>
  );
}
