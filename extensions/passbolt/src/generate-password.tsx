import { Form, ActionPanel, Action, showToast, Toast, Clipboard, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { generatePassword, getDefaultPasswordOptions, PasswordOptions } from "./utils/password-generator";

export default function GeneratePassword() {
  const [password, setPassword] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState<PasswordOptions>(getDefaultPasswordOptions());

  // Generate password on mount and when options change
  useEffect(() => {
    regeneratePassword();
  }, [options]);

  async function regeneratePassword() {
    setIsGenerating(true);
    try {
      const newPassword = generatePassword(options);
      setPassword(newPassword);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Generation failed",
        message: String(error),
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyPassword() {
    await Clipboard.copy(password);
    showToast({
      style: Toast.Style.Success,
      title: "Password copied!",
    });
  }

  async function pastePassword() {
    await Clipboard.paste(password);
    showToast({
      style: Toast.Style.Success,
      title: "Password pasted!",
    });
  }

  function updateOption<K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Form
      isLoading={isGenerating}
      actions={
        <ActionPanel>
          <Action title="Copy Password" onAction={copyPassword} icon={Icon.Clipboard} />
          <Action title="Paste Password" onAction={pastePassword} icon={Icon.Text} />
          <Action title="Regenerate" onAction={regeneratePassword} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    >
      <Form.Description title="🔑 Generated Password" text={password || "Generating..."} />
      <Form.Separator />

      <Form.Dropdown
        id="type"
        title="Type"
        value={options.type}
        onChange={(value) => {
          const newType = value as "password" | "passphrase";
          if (newType === "passphrase") {
            setOptions({
              type: "passphrase",
              words: 4,
              separator: "-",
              capitalize: false,
              includeNumber: false,
            });
          } else {
            setOptions(getDefaultPasswordOptions());
          }
        }}
      >
        <Form.Dropdown.Item value="password" title="Password" />
        <Form.Dropdown.Item value="passphrase" title="Passphrase" />
      </Form.Dropdown>

      {options.type === "passphrase" ? (
        <>
          <Form.TextField
            id="words"
            title="Number of Words"
            placeholder="3 - 20"
            value={String(options.words || 4)}
            onChange={(value) => {
              const num = parseInt(value) || 4;
              updateOption("words", Math.max(3, Math.min(20, num)));
            }}
          />
          <Form.TextField
            id="separator"
            title="Word Separator"
            placeholder="-"
            value={options.separator || "-"}
            onChange={(value) => updateOption("separator", value || "-")}
          />
          <Form.Checkbox
            id="capitalize"
            title="Capitalize"
            label="This-Is-A-Passphrase"
            value={options.capitalize || false}
            onChange={(value) => updateOption("capitalize", value)}
          />
          <Form.Checkbox
            id="includeNumber"
            title="Include Number"
            label="This-Is-A-Passphrase-1234"
            value={options.includeNumber || false}
            onChange={(value) => updateOption("includeNumber", value)}
          />
        </>
      ) : (
        <>
          <Form.TextField
            id="length"
            title="Length"
            placeholder="5 - 128"
            value={String(options.length || 16)}
            onChange={(value) => {
              const num = parseInt(value) || 16;
              updateOption("length", Math.max(5, Math.min(128, num)));
            }}
          />
          <Form.Checkbox
            id="uppercase"
            title="Uppercase Characters"
            label="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            value={options.uppercase !== false}
            onChange={(value) => updateOption("uppercase", value)}
          />
          <Form.Checkbox
            id="lowercase"
            title="Lowercase Characters"
            label="abcdefghijklmnopqrstuvwxyz"
            value={options.lowercase !== false}
            onChange={(value) => updateOption("lowercase", value)}
          />
          <Form.Checkbox
            id="numbers"
            title="Numeric Characters"
            label="0123456789"
            value={options.numbers !== false}
            onChange={(value) => updateOption("numbers", value)}
          />
          {options.numbers && (
            <Form.TextField
              id="minNumbers"
              title="Minimum Numbers"
              placeholder="1"
              value={String(options.minNumbers || 1)}
              onChange={(value) => {
                const num = parseInt(value) || 0;
                updateOption("minNumbers", Math.max(0, Math.min(9, num)));
              }}
            />
          )}
          <Form.Checkbox
            id="special"
            title="Special Characters"
            label="!@#$%^&*()_+-=[]{}|;:,.<>?"
            value={options.special !== false}
            onChange={(value) => updateOption("special", value)}
          />
          {options.special && (
            <Form.TextField
              id="minSpecial"
              title="Minimum Special"
              placeholder="1"
              value={String(options.minSpecial || 1)}
              onChange={(value) => {
                const num = parseInt(value) || 0;
                updateOption("minSpecial", Math.max(0, Math.min(9, num)));
              }}
            />
          )}
        </>
      )}
    </Form>
  );
}
