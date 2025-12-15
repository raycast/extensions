import { ActionPanel, Action, Form, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import crypto from "crypto";

export default function Command() {
  const [passphrase, setPassphrase] = useState("");
  const [salt, setSalt] = useState("salt");
  const [iterations, setIterations] = useState("10000");
  const [result, setResult] = useState("");

  useEffect(() => {
    Clipboard.readText().then((clip) => {
      if (clip) {
        setPassphrase(clip);
      }
    });
  }, []);

  useEffect(() => {
    if (!passphrase) {
      setResult("");
      return;
    }

    try {
      let rounds = parseInt(iterations, 10);
      if (isNaN(rounds) || rounds < 1) rounds = 1;
      if (rounds > 100000) rounds = 100000; // Cap to prevent lag

      const derivedKey = crypto.pbkdf2Sync(passphrase, salt || "", rounds, 64, "sha256"); // 64 bytes
      setResult(derivedKey.toString("hex").toUpperCase());
    } catch {
      setResult("Error calculating");
    }
  }, [passphrase, salt, iterations]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={result} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="passphrase"
        title="Passphrase"
        placeholder="Enter passphrase..."
        value={passphrase}
        onChange={setPassphrase}
      />
      <Form.TextField id="salt" title="Salt" placeholder="Salt value" value={salt} onChange={setSalt} />
      <Form.TextField
        id="iterations"
        title="Iterations"
        placeholder="10000"
        value={iterations}
        onChange={setIterations}
      />
      <Form.Description title="Derived Key (Hex)" text={result} />
    </Form>
  );
}
