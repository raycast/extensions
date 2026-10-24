import { Action, ActionPanel, Clipboard, Form, Icon, closeMainWindow, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { generatePassword, initCrypto, passwordStrength } from "./vendor/shared/index.js";
import { copySecret } from "./lib/clipboard";

const STRENGTH_LABEL = ["molto debole", "debole", "discreta", "buona", "ottima"];

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

  function regenerate(): string | null {
    const n = Number(length);
    if (!Number.isInteger(n) || n < 8 || n > 128) {
      setLengthError("Lunghezza tra 8 e 128");
      return null;
    }
    if (!lowercase && !uppercase && !digits && !symbols) return null;
    try {
      const pw = generatePassword({ length: n, lowercase, uppercase, digits, symbols, excludeAmbiguous });
      setPassword(pw);
      return pw;
    } catch {
      return null;
    }
  }

  // rigenera ad ogni cambio di opzione
  useEffect(() => {
    if (ready) regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, length, lowercase, uppercase, digits, symbols, excludeAmbiguous]);

  async function copy() {
    const pw = password || regenerate();
    if (!pw) return;
    await copySecret(pw);
    await showHUD("Password copiata (si cancella tra 30 s)");
  }

  async function paste() {
    const pw = password || regenerate();
    if (!pw) return;
    await closeMainWindow();
    await Clipboard.paste(pw);
  }

  return (
    <Form
      isLoading={!ready}
      navigationTitle="Genera password"
      actions={
        <ActionPanel>
          <Action title="Copia password" icon={Icon.Clipboard} onAction={copy} />
          <Action title="Incolla password" icon={Icon.Text} shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} onAction={paste} />
          <Action title="Rigenera" icon={Icon.ArrowClockwise} shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => regenerate()} />
        </ActionPanel>
      }
    >
      <Form.Description title="Password" text={password || "—"} />
      <Form.Description title="Robustezza" text={password ? STRENGTH_LABEL[passwordStrength(password)]! : "—"} />
      <Form.Separator />
      <Form.TextField
        id="length"
        title="Lunghezza"
        value={length}
        error={lengthError}
        onChange={(v) => {
          setLength(v);
          setLengthError(undefined);
        }}
      />
      <Form.Checkbox id="lowercase" label="Minuscole (a-z)" value={lowercase} onChange={setLowercase} />
      <Form.Checkbox id="uppercase" label="Maiuscole (A-Z)" value={uppercase} onChange={setUppercase} />
      <Form.Checkbox id="digits" label="Cifre (0-9)" value={digits} onChange={setDigits} />
      <Form.Checkbox id="symbols" label="Simboli (!@#$…)" value={symbols} onChange={setSymbols} />
      <Form.Checkbox id="excludeAmbiguous" label="Escludi caratteri ambigui (l, I, O, 0, 1)" value={excludeAmbiguous} onChange={setExcludeAmbiguous} />
    </Form>
  );
}
