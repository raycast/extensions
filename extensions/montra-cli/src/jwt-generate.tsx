import { Action, ActionPanel, Detail, Form } from "@raycast/api";
import EnvDropdown from "./ui/EnvDropdown";
import { Environment, envToArg, runMontra } from "./utils/exec";
import { useState } from "react";

interface Values {
  environment: Environment;
  subject?: string;
  issuer?: string;
}

export default function Command() {
  const [token, setToken] = useState<string | undefined>();
  const masked = token ? `${token.slice(0, 6)}…${token.slice(-6)}` : "";

  async function submit(values: Values) {
    const args = ["jwt", ...envToArg(values.environment)];
    if (values.subject) args.push("--subject", values.subject);
    if (values.issuer) args.push("--issuer", values.issuer);
    const { stdout } = await runMontra(args);
    setToken(stdout.trim());
  }

  return (
    <Detail
      navigationTitle="JWT: Generate"
      markdown={token ? `Token: ${masked}` : "Generate a JWT token by filling the form"}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Generate Form"
            target={
              <Form
                actions={
                  <ActionPanel>
                    <Action.SubmitForm title="Generate" onSubmit={submit} />
                  </ActionPanel>
                }
              >
                <EnvDropdown />
                <Form.TextField id="subject" title="Subject" />
                <Form.TextField id="issuer" title="Issuer" />
              </Form>
            }
          />
          {token && <Action.CopyToClipboard title="Copy Token" content={token} />}
        </ActionPanel>
      }
    />
  );
}
