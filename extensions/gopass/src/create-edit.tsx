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
  confirmAlert,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

const createFormText =
  "Provide name for password and set desired password attributes. Password will be saved to clipboard on creation.";
const editFormText = "Update desired password attributes. Password will be saved to clipboard on update.";

const randomPasswordLength = 20;
const xkcdPasswordLength = 5;

interface SignUpFormValues {
  name: string;
  size: string;
  length: number;
  symbols: boolean;
  digits: boolean;
  capitalize: boolean;
  visiblePassword: string; // note both of these passwords are the same - used to show/hide password value
  hiddenPassword: string; // note both of these passwords are the same - used to show/hide password value
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

interface PasswordConfig {
  length: string;
  digits: boolean;
  symbols: boolean;
  capitalize: boolean;
  numbers: boolean;
  type: string;
}

export default function ({ inputPassword = undefined }: InputProps): JSX.Element {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [name, setName] = useState<string>("");
  const [originalName, setOriginalName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [additionalAttributes, setAdditionalAttributes] = useState<string>("");
  const [showErrors, setShowErrors] = useState<boolean>(true);
  const [passwordConfig, setPasswordConfig] = useState<PasswordConfig>({
    length: randomPasswordLength.toString(),
    digits: true,
    symbols: true,
    capitalize: true,
    numbers: true,
    type: "random",
  });

  const setNewPassword = async () => {
    updatePassword(passwordConfig);
    setLoading(false);
  };

  const getInputPassword = async () => {
    if (!inputPassword) return;
    const password = await gopass.show(inputPassword);
    setPassword(password.password);
    setPasswordConfig({ ...passwordConfig, length: password.password.length.toString() });
    setAdditionalAttributes(password.attributes.join("\n"));
    setName(inputPassword);
    setOriginalName(inputPassword);
    setLoading(false);
  };

  const updatePassword = async (config: PasswordConfig) => {
    setPassword(
      await renderPassword({
        type: config.type,
        length:
          Number(config.length) > 0
            ? Number(config.length)
            : config.type === "xkcd"
            ? xkcdPasswordLength
            : randomPasswordLength,
        digits: config.digits,
        symbols: config.symbols,
        capitalize: config.capitalize,
        numbers: config.numbers,
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

  useEffect(() => {
    if (isLoading) {
      inputPassword ? getInputPassword() : setNewPassword();
    }
  }, [getInputPassword]);

  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    async onSubmit(values: SignUpFormValues) {
      if (isLoading) return; // ignore submissions until ready

      // if a update and name has changed confirm with user the needed dual save and move operation
      if (
        originalName &&
        values.name !== originalName &&
        !(await confirmAlert({
          title: `Updating a password name requires a save and move operation, confirm this is expected?`,
        }))
      ) {
        await showToast({ title: `Password update canceled`, style: Toast.Style.Success });
        return;
      }
      // on new passwords check password exists or not and prompt if it does for overwrite
      if (
        !originalName &&
        (await gopass.exists(values.name)) &&
        !(await confirmAlert({ title: `Password "${values.name}" already exists, overwrite?` }))
      ) {
        await showToast({ title: `Password creation canceled`, style: Toast.Style.Success });
        return;
      }

      const inputString = `${password}\n${values.additionalAttributes}\n`; // ignore the password field values as we dont know which one is active
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `${inputPassword ? "Updating" : "Creating"} password...`,
      });
      await gopass.insert(values.name, inputString, true);
      toast.style = Toast.Style.Success;
      toast.title = `Successfully ${inputPassword ? "updated" : "created"} password`;
      await toast.hide();

      // perform move if required.
      if (originalName && values.name !== originalName) {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Moving password from ${originalName} to ${values.name}...`,
        });
        await gopass.move(originalName, values.name, true);
        toast.style = Toast.Style.Success;
        toast.title = `Successfully moved password`;
        await toast.hide();
      }

      await Clipboard.copy(password);
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
      hiddenPassword: () => {
        // we ignore the field value as we dont know which one is active
        if (password === undefined || password === "") {
          setShowErrors(true);
          return "Value Required";
        }
      },
      visiblePassword: () => {
        // we ignore the field value as we dont know which one is active
        if (password === undefined || password === "") {
          setShowErrors(true);
          return "Value Required";
        }
      },
      additionalAttributes: (value: string | undefined) => {
        if (value !== undefined && value !== "") {
          const rAttributes = /^(?:(?:[^:,\n]+:[^\n]+)\n)*(?:[^:,\n]+:[^\n]+)$/;
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
      isLoading={isLoading}
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
      <Form.Dropdown
        id="style"
        title="Password Style"
        value={passwordConfig.type}
        onChange={(value) => {
          if (isLoading) return;
          const newLength = value === "xkcd" ? xkcdPasswordLength.toString() : randomPasswordLength.toString();
          setPasswordConfig({ ...passwordConfig, length: newLength, type: value });
          updatePassword({ ...passwordConfig, length: newLength, type: value });
        }}
      >
        <Form.Dropdown.Item value="random" title="Random" icon="🎲" />
        <Form.Dropdown.Item value="xkcd" title="XKCD" icon="💬" />
      </Form.Dropdown>
      <Form.TextField
        title="Length"
        id="length"
        value={passwordConfig.length}
        onChange={(value) => {
          if (isLoading) return;
          setPasswordConfig({ ...passwordConfig, length: value });
          updatePassword({ ...passwordConfig, length: value });
        }}
      />
      {passwordConfig.type === "random" && (
        <>
          <Form.Checkbox
            id="digits"
            label="Digits"
            value={passwordConfig.digits}
            onChange={(value) => {
              if (isLoading) return;
              setPasswordConfig({ ...passwordConfig, digits: value });
              updatePassword({ ...passwordConfig, digits: value });
            }}
          />
          <Form.Checkbox
            id="symbols"
            label="Special Symbols"
            value={passwordConfig.symbols}
            onChange={(value) => {
              if (isLoading) return;
              setPasswordConfig({ ...passwordConfig, symbols: value });
              updatePassword({ ...passwordConfig, symbols: value });
            }}
          />
        </>
      )}
      {passwordConfig.type === "xkcd" && (
        <>
          <Form.Checkbox
            id="capitalize"
            label="Capitlize"
            value={passwordConfig.capitalize}
            onChange={(value) => {
              if (isLoading) return;
              setPasswordConfig({ ...passwordConfig, capitalize: value });
              updatePassword({ ...passwordConfig, capitalize: value });
            }}
          />
          <Form.Checkbox
            id="numbers"
            label="Numbers"
            value={passwordConfig.numbers}
            onChange={(value) => {
              if (isLoading) return;
              setPasswordConfig({ ...passwordConfig, numbers: value });
              updatePassword({ ...passwordConfig, numbers: value });
            }}
          />
        </>
      )}
      {showPassword && (
        <Form.TextField
          title="Password"
          id="visiblePassword"
          value={password}
          error={displayFormErrors(itemProps.visiblePassword.error)}
          onBlur={resetErrors}
          onChange={setPassword}
        />
      )}
      {!showPassword && (
        <Form.PasswordField
          title="Password"
          id="hiddenPassword"
          value={password}
          error={displayFormErrors(itemProps.hiddenPassword.error)}
          onBlur={resetErrors}
          onChange={setPassword}
        />
      )}
      <Form.Checkbox id="passwordVisible" label="Show Password?" value={showPassword} onChange={setShowPassword} />
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
