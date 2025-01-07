import { useEffect, useState } from "react";
import gopass from "./gopass";

import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Clipboard,
  closeMainWindow,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

const createFormText =
  "Provide name for password and set desired password attributes. Password will be saved to clipboard on creation.";
const editFormText = "Update desired password attributes. Password will be saved to clipboard on update.";

interface SignUpFormValues {
  name: string;
  size: string;
  length: number;
  symbols: boolean;
  digits: boolean;
  capitalize: boolean;
  password: string;
  additionalAttributes: string;
}

interface renderPasswordProps {
  type: string;
  length: number;
  digits: boolean;
  symbols: boolean;
  capitalize: boolean;
  numbers: boolean;
}
async function renderPassword(props: renderPasswordProps): Promise<string> {
  const passwords = await gopass.pwgen(
    props.type,
    props.length,
    props.symbols,
    props.digits,
    props.capitalize,
    props.numbers
  );
  return passwords[Math.floor(Math.random() * passwords.length)].trimEnd();
}

interface InputProps {
  inputPassword?: string;
}

export default function ({ inputPassword = undefined }: InputProps): JSX.Element {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [additionalAttributes, setAdditionalAttributes] = useState<string>("");
  const [length, setLength] = useState<number>(12);
  const [digits, setDigits] = useState<boolean>(true);
  const [symbols, setSymbols] = useState<boolean>(true);
  const [capitalize, setCapitalize] = useState<boolean>(true);
  const [numbers, setNumbers] = useState<boolean>(true);
  const [type, setType] = useState<string>("random");
  const [showErrors, setShowErrors] = useState<boolean>(true);

  const getInputPassword = async () => {
    if (!inputPassword) return;
    const password = await gopass.showAll(inputPassword);
    setPassword(password.password);
    setAdditionalAttributes(password.attributes.join("\n"));
    setName(inputPassword);
  };

  const updatePassword = async () => {
    setPassword(
      await renderPassword({
        type: type,
        length: length,
        digits: digits,
        symbols: symbols,
        capitalize: capitalize,
        numbers: numbers,
      })
    );
  };

  const resetErrors = () => {
    setShowErrors(false);
  };

  const displayFormErrors = (error: string | undefined) => {
    if (showErrors) {
      return error;
    }
  };

  if (isLoading) {
    if (inputPassword) {
      getInputPassword();
    } else {
      updatePassword();
    }
    setLoading(false);
  }

  useEffect(() => {
    !isLoading && type === "xkcd" ? setLength(5) : setLength(12);
  }, [type]);

  useEffect(() => {
    if (!isLoading) updatePassword();
  }, [type, length, digits, symbols, capitalize, numbers]);

  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    async onSubmit(values: SignUpFormValues) {
      const inputString = `${values.password}\n${values.additionalAttributes}\n`;
      console.log(inputString);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `${inputPassword ? "Updating" : "Creating"} password...`,
      });
      await gopass.insert(values.name, inputString, true);
      toast.style = Toast.Style.Success;
      toast.title = `Successfully ${inputPassword ? "updated" : "created"} password`;
      await Clipboard.copy(values.password);
      await toast.hide();
      await closeMainWindow();
      await popToRoot();
      await showHUD("Password copied to clipboard");
    },
    validation: {
      name: (value: string | undefined) => {
        if (value === undefined || value === "") {
          setShowErrors(true);
          return "Value Required";
        }
      },
      password: (value: string | undefined) => {
        if (value === undefined || value === "") {
          setShowErrors(true);
          return "Value Required";
        }
      },
      additionalAttributes: (value: string | undefined) => {
        if (value !== undefined && value !== "") {
          const rAttributes = /^(?:(?:[^:,\n]+:[^:,\n]+)\n)*(?:[^:,\n]+:[^:,\n]+)$/;
          if (!rAttributes.test(value)) {
            setShowErrors(true);
            return "Attributes must be key/value pairs in format `foo:bar` - one per line";
          }
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={inputPassword ? "Update" : "Create"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`${inputPassword ? "Edit" : "Create New"} Password`}
        text={inputPassword ? editFormText : createFormText}
      />
      <Form.TextField
        title="Name"
        id="name"
        value={name}
        onChange={setName}
        error={displayFormErrors(itemProps.name.error)}
        onBlur={resetErrors}
      />
      <Form.Dropdown id="style" title="Password Style" value={type} onChange={setType}>
        <Form.Dropdown.Item value="random" title="Random" icon="🎲" />
        <Form.Dropdown.Item value="xkcd" title="XKCD" icon="💬" />
      </Form.Dropdown>
      <Form.TextField
        title="Length"
        id="length"
        value={length.toString()}
        onChange={(value) => {
          if (!isNaN(Number(value))) setLength(Number(value));
        }}
      />
      {type === "random" && (
        <>
          <Form.Checkbox id="digits" label="Digits" value={digits} onChange={setDigits} />
          <Form.Checkbox id="symbols" label="Special Symbols" value={symbols} onChange={setSymbols} />
        </>
      )}
      {type === "xkcd" && (
        <>
          <Form.Checkbox id="capitalize" label="Capitlize" value={capitalize} onChange={setCapitalize} />
          <Form.Checkbox id="numbers" label="Numbers" value={numbers} onChange={setNumbers} />
        </>
      )}

      <Form.TextField
        title="Password"
        id="password"
        value={password}
        error={displayFormErrors(itemProps.password.error)}
        onBlur={resetErrors}
        onChange={setPassword}
      />
      <Form.Separator />
      <Form.Description
        title="Additional Password Attributes"
        text="Input additional attrbutes in key:value format i.e. 'username: foo@bar.com'"
      />
      <Form.TextArea
        id="additionalAttributes"
        value={additionalAttributes}
        error={displayFormErrors(itemProps.additionalAttributes.error)}
        onBlur={resetErrors}
        onChange={setAdditionalAttributes}
      />
    </Form>
  );
}
