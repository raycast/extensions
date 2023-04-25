import { Action, ActionPanel, Form, Keyboard, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { IDE, updateIdesConfig, useIdes } from "./ide";

type Errors = {
  [key: string]: {
    description: string;
    displayError: boolean;
  };
};

export default function Configuration() {
  const [errors, setErrors] = useState<Errors>({});

  const ides = useIdes();

  const parseShortcut = (shortcut: string): Keyboard.Shortcut => {
    const keys = shortcut.replaceAll(" ", "").split("+");
    const key = keys.pop();
    const modifiers = keys;
    const availableModifiers: Keyboard.KeyModifier[] = ["cmd", "ctrl", "opt", "shift"];

    if (!key || modifiers.length == 0 || modifiers.length > 2) {
      throw Error("Shortcut is invalid");
    }

    if (modifiers.some((modifier) => !availableModifiers.includes(modifier as Keyboard.KeyModifier))) {
      throw Error("Shortcut contain invalid modifiers");
    }
    return {
      modifiers: modifiers as Keyboard.KeyModifier[],
      key: key as Keyboard.KeyEquivalent,
    };
  };

  const onSubmit = (shortcuts: Form.Values) => {
    const idesWithNewShortcuts: IDE[] = ides.map((ide) => {
      const newShortcut = () => {
        try {
          return parseShortcut(shortcuts[ide.appName]);
        } catch (_) {
          return ide.shortcut;
        }
      };

      return {
        ...ide,
        shortcut: newShortcut(),
      };
    });
    updateIdesConfig(idesWithNewShortcuts).then(() => {
      showToast({ style: Toast.Style.Success, title: "Shortcuts saved!" });
    });
  };

  const clearError = (ide: string) => {
    if (errors[ide]?.displayError) {
      const errorsCopy = { ...errors };
      delete errorsCopy[ide];
      setErrors(errorsCopy);
    }
  };

  const validateShortcut = (ide: string, input?: string) => {
    let errorDescription = "";
    const isValidShortcut = (input?: string) => {
      if (!input) return false;
      try {
        parseShortcut(input);
        return true;
      } catch (_) {
        return false;
      }
    };
    if (input === "") {
      errorDescription = "Shortcut cannot be empty";
    } else if (!isValidShortcut(input)) {
      errorDescription = `Shortcut must be "modifier + modifier[opt] + key"`;
      showToast({
        title: "Modifier must be one of: opt | shift | cmd | ctrl",
        style: Toast.Style.Failure,
      });
    }

    if (errorDescription) {
      setErrors((e) => ({
        ...e,
        [ide]: {
          displayError: true,
          description: errorDescription,
        },
      }));
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Shortcuts" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      {ides.map((ide) => (
        <Form.TextField
          error={errors[ide.appName]?.displayError ? errors[ide.appName].description : undefined}
          onBlur={(event) => validateShortcut(ide.appName, event.target.value)}
          onChange={() => clearError(ide.appName)}
          key={ide.appName}
          id={ide.appName}
          title={`${ide.displayName} Shortcut`}
          defaultValue={`${ide.shortcut.modifiers.join(" + ")} + ${ide.shortcut.key}`}
          placeholder="modifier + modifier[opt] + key"
        />
      ))}
    </Form>
  );
}
