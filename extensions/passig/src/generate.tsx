import { Action, ActionPanel, Clipboard, Form, Icon, closeMainWindow, showHUD, Keyboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { generatePassword, initCrypto, passwordStrength } from "./vendor/shared/index.js";
import { t } from "./i18n";
import { copySecret } from "./lib/clipboard";
import { strengthLabel } from "./lib/plan";

/** Generatore password: non richiede lo sblocco del vault. */
export default function GenerateCommand() {
  const [ready, setReady] = useState(false);
  const [length, setLength] = useState("20");
  const [lowercase, setLowercase] = useState(true);
  const [uppercase, setUppercase] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [password, setPassword] = useState("");
  const [lengthError, setLengthError] = useState<string | undefined>();

  useEffect(() => {
    initCrypto().then(() => setReady(true));
  }, []);

  /** Lunghezza valida (8-128) e almeno un set di caratteri: altrimenti null. */
  function validLength(): number | null {
    const n = Number(length);
    if (!Number.isInteger(n) || n < 8 || n > 128) return null;
    if (!lowercase && !uppercase && !digits && !symbols) return null;
    return n;
  }

  /** Genera con le impostazioni correnti; con impostazioni non valide azzera la password mostrata. */
  function regenerate(): string | null {
    const n = validLength();
    if (n === null) {
      if (!Number.isInteger(Number(length)) || Number(length) < 8 || Number(length) > 128)
        setLengthError(t("generate.lengthError"));
      setPassword("");
      return null;
    }
    try {
      const pw = generatePassword({ length: n, lowercase, uppercase, digits, symbols, excludeAmbiguous });
      setPassword(pw);
      return pw;
    } catch {
      setPassword("");
      return null;
    }
  }

  /** Password da copiare/incollare: solo se le impostazioni CORRENTI sono valide (mai una vecchia). */
  function currentPassword(): string | null {
    if (validLength() === null) return regenerate();
    return password || regenerate();
  }

  // rigenera ad ogni cambio di opzione
  useEffect(() => {
    if (ready) regenerate();
  }, [ready, length, lowercase, uppercase, digits, symbols, excludeAmbiguous]);

  async function copy() {
    const pw = currentPassword();
    if (!pw) return;
    await copySecret(pw);
    await showHUD(t("search.passwordCopied"));
  }

  async function paste() {
    const pw = currentPassword();
    if (!pw) return;
    await closeMainWindow();
    await Clipboard.paste(pw);
  }

  return (
    <Form
      isLoading={!ready}
      navigationTitle={t("generate.navTitle")}
      actions={
        <ActionPanel>
          <Action title={t("action.copyPassword")} icon={Icon.Clipboard} onAction={copy} />
          <Action
            title={t("action.pastePassword")}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={paste}
          />
          <Action
            title={t("generate.regenerate")}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => regenerate()}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={t("common.password")} text={password || "—"} />
      <Form.Description
        title={t("generate.strength")}
        text={password ? strengthLabel(passwordStrength(password)) : "—"}
      />
      <Form.Separator />
      <Form.TextField
        id="length"
        title={t("generate.length")}
        value={length}
        error={lengthError}
        onChange={(v) => {
          setLength(v);
          setLengthError(undefined);
        }}
      />
      <Form.Checkbox id="lowercase" label={t("generate.lowercase")} value={lowercase} onChange={setLowercase} />
      <Form.Checkbox id="uppercase" label={t("generate.uppercase")} value={uppercase} onChange={setUppercase} />
      <Form.Checkbox id="digits" label={t("generate.digits")} value={digits} onChange={setDigits} />
      <Form.Checkbox id="symbols" label={t("generate.symbols")} value={symbols} onChange={setSymbols} />
      <Form.Checkbox
        id="excludeAmbiguous"
        label={t("generate.excludeAmbiguous")}
        value={excludeAmbiguous}
        onChange={setExcludeAmbiguous}
      />
    </Form>
  );
}
