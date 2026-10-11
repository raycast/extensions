import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { PasswordOptions, generatePassword, passwordStrength, randomInt } from "./utils/toolbox";
import { ResultList, ResultRow } from "./components/ResultList";

export default function Command() {
  const { push } = useNavigation();
  const [options, setOptions] = useState<PasswordOptions>({
    length: 20,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
  });

  const update = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Passwords"
            icon={Icon.Key}
            onSubmit={() => {
              try {
                push(<PasswordResult options={options} />);
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Generation failed",
                  message: (error as Error).message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="length"
        title="Length"
        defaultValue={String(options.length)}
        onChange={(value) => {
          const parsed = Number(value);
          update("length", Number.isFinite(parsed) && parsed > 0 ? parsed : 20);
        }}
      />
      <Form.Checkbox
        id="lowercase"
        label="Include lowercase a-z"
        value={options.lowercase}
        onChange={(v) => update("lowercase", v)}
      />
      <Form.Checkbox
        id="uppercase"
        label="Include uppercase A-Z"
        value={options.uppercase}
        onChange={(v) => update("uppercase", v)}
      />
      <Form.Checkbox
        id="digits"
        label="Include digits 0-9"
        value={options.digits}
        onChange={(v) => update("digits", v)}
      />
      <Form.Checkbox
        id="symbols"
        label="Include symbols !@#$%"
        value={options.symbols}
        onChange={(v) => update("symbols", v)}
      />
      <Form.Checkbox
        id="excludeAmbiguous"
        label="Exclude ambiguous characters Il1O0o"
        value={options.excludeAmbiguous}
        onChange={(v) => update("excludeAmbiguous", v)}
      />
    </Form>
  );
}

/** Regenerated on every render so the strength label always matches the password shown */
function PasswordResult({ options }: { options: PasswordOptions }) {
  const { push } = useNavigation();
  const passwords = [generatePassword(options), generatePassword(options), generatePassword(options)];

  const rows: ResultRow[] = passwords.map((password, index) => {
    const strength = passwordStrength(password);
    return {
      id: `password-${index}`,
      title: password,
      subtitle: `Strength: ${strength.label} · ~${strength.entropy} bits${index === 0 ? " · recommended" : ""}`,
      icon: strength.score > 70 ? Icon.CircleDisabled : Icon.Circle,
      copyValue: password,
      actions:
        index === 0 ? (
          <Action
            title="Regenerate"
            icon={Icon.ArrowClockwise}
            onAction={() => push(<PasswordResult options={options} />)}
          />
        ) : undefined,
    };
  });

  rows.push({
    id: "random-int",
    title: String(randomInt(1, 1000000)),
    subtitle: "Bonus: random integer 1-1000000",
    icon: Icon.Number00,
  });

  return <ResultList sectionTitle="Generated Passwords (press ⏎ to copy)" rows={rows} />;
}
