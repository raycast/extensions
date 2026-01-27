import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchProps,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { spawn, ChildProcess } from "child_process";
import { useState, useEffect, useCallback, useRef } from "react";
import { MACOS_PATH, getPasswordGeneratorPath } from "./utils";

interface Arguments {
  domain: string;
  username?: string;
  version?: string;
}

type Stage =
  | "starting"
  | "unlock-touch"
  | "password-touch"
  | "enter-pin"
  | "success"
  | "error";

export default function QuickGenerate(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { domain, username, version } = props.arguments;
  const PASSWORD_GENERATOR_PATH = getPasswordGeneratorPath();

  // If version is provided, we can use --skip-state for single-touch mode
  const useSkipState = Boolean(version);
  const parsedVersion = version ? parseInt(version, 10) || 1 : 1;

  const [stage, setStage] = useState<Stage>(
    useSkipState ? "password-touch" : "starting",
  );
  const [error, setError] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const processRef = useRef<ChildProcess | null>(null);
  const outputBufferRef = useRef<string>("");
  const stderrBufferRef = useRef<string>("");

  const sendInput = useCallback((input: string) => {
    if (processRef.current?.stdin) {
      processRef.current.stdin.write(input + "\n");
    }
  }, []);

  const handlePinSubmit = useCallback(
    (values: { pin: string }) => {
      if (!values.pin) return;

      setPinError(false);

      // Verify PIN with --check-pin before sending
      const checkProc = spawn(PASSWORD_GENERATOR_PATH, ["--check-pin"], {
        env: { ...process.env, PATH: MACOS_PATH },
      });

      checkProc.stdin?.write(values.pin + "\n");
      checkProc.stdin?.end();

      checkProc.on("close", (code) => {
        if (code === 0) {
          // PIN correct, send to password generation process
          sendInput(values.pin);
        } else {
          // PIN wrong, show error
          setPinError(true);
        }
      });
    },
    [sendInput, PASSWORD_GENERATOR_PATH],
  );

  // Start process on mount
  useEffect(() => {
    if (processRef.current) return;

    // Build args based on whether we can use --skip-state
    const args = [domain];
    if (useSkipState) {
      args.push("--skip-state", "-v", String(parsedVersion));
    }
    if (username) {
      args.push("-u", username);
    }

    const proc = spawn(PASSWORD_GENERATOR_PATH, args, {
      env: { ...process.env, PATH: MACOS_PATH },
    });

    processRef.current = proc;

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      outputBufferRef.current += text;

      if (text.includes("copied to clipboard")) {
        setStage("success");
        showHUD("Password copied to clipboard!");
        setTimeout(() => popToRoot(), 1000);
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderrBufferRef.current += text;

      if (text.includes("Touch YubiKey to unlock state")) {
        setStage("unlock-touch");
      } else if (text.includes("Touch YubiKey for password")) {
        setStage("password-touch");
      } else if (text.includes("Enter PIN:")) {
        setStage("enter-pin");
      } else if (text.includes("copied to clipboard")) {
        setStage("success");
        showHUD("Password copied to clipboard!");
        setTimeout(() => popToRoot(), 1000);
      }
    });

    proc.on("error", (err) => {
      setError(`Spawn error: ${err.message}`);
      setStage("error");
    });

    proc.on("close", (code) => {
      // Only set error if we haven't succeeded and process exited unexpectedly
      if (code !== 0) {
        const allOutput = `STDOUT:\n${outputBufferRef.current}\n\nSTDERR:\n${stderrBufferRef.current}`;
        if (!allOutput.includes("copied to clipboard")) {
          setError(`Exit code: ${code}\n\n${allOutput}`);
          setStage("error");
        }
      }
    });

    return () => {
      // Don't kill on cleanup - let the process complete
    };
  }, [domain, username, PASSWORD_GENERATOR_PATH, useSkipState, parsedVersion]);

  const subtitle = username ? `${domain} / ${username}` : domain;

  if (stage === "starting") {
    return (
      <Detail
        markdown={`# Starting...

Launching ypass for \`${subtitle}\`...`}
      />
    );
  }

  if (stage === "unlock-touch") {
    return (
      <Detail
        markdown={`# Touch YubiKey

Touch your YubiKey to unlock state...

**Domain:** \`${domain}\`${username ? `\n**Username:** \`${username}\`` : ""}

*Waiting for hardware interaction...*`}
      />
    );
  }

  if (stage === "password-touch") {
    return (
      <Detail
        markdown={`# Touch YubiKey Again

Touch your YubiKey to generate password...

**Domain:** \`${domain}\`${username ? `\n**Username:** \`${username}\`` : ""}

*Waiting for hardware interaction...*`}
      />
    );
  }

  if (stage === "enter-pin") {
    return (
      <Form
        enableDrafts={false}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit Pin" onSubmit={handlePinSubmit} />
          </ActionPanel>
        }
      >
        <Form.Description title="Domain" text={domain} />
        {username && <Form.Description title="Username" text={username} />}
        {pinError && (
          <Form.Description title="" text="Wrong PIN. Please try again." />
        )}
        <Form.PasswordField
          id="pin"
          title="PIN"
          placeholder="Enter your YubiKey PIN"
          autoFocus
          error={pinError ? "Wrong PIN" : undefined}
        />
      </Form>
    );
  }

  if (stage === "success") {
    return (
      <Detail
        markdown={`# Password Generated!

Password for \`${subtitle}\` has been copied to your clipboard.

It will be cleared in 20 seconds.`}
      />
    );
  }

  if (stage === "error") {
    return (
      <Detail
        markdown={`# Error

\`\`\`
${error}
\`\`\`

**Command:** \`${PASSWORD_GENERATOR_PATH} ${domain}${useSkipState ? ` --skip-state -v ${parsedVersion}` : ""}${username ? ` -u ${username}` : ""}\`

**Troubleshooting:**
- Make sure \`ykchalresp\` is installed: \`brew install ykpers\`
- Check that your YubiKey is connected
- Verify the binary path in extension preferences`}
        actions={
          <ActionPanel>
            <Action title="Close" onAction={() => popToRoot()} />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown="Loading..." />;
}
