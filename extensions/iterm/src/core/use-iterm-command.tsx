import { useEffect, useMemo, useState } from "react";
import { runAppleScript } from "run-applescript";

const WINDOW_VAR_NAME = "commandWindow";

export interface ItermCommandOpts {
  command: string;
  location?: "new-window" | "new-tab";
}

interface Result {
  loading: boolean;
  error?: Error;
  success: boolean;
}

const openWindowIfNone = () =>
  `
  if windows of application "iTerm" is {} then 
    set ${WINDOW_VAR_NAME} to (create window with default profile)
  else
    set ${WINDOW_VAR_NAME} to current window
  end if
  `;
const openInNewWindow = () => `set ${WINDOW_VAR_NAME} to (create window with default profile)`;
const openInNewTab = () => `tell ${WINDOW_VAR_NAME} to create tab with default profile`;

const makeScript = ({ command, location }: ItermCommandOpts) => {
  const escaped = command.replace(/"/g, '\\"');
  return `
  tell application "iTerm"
    launch
    repeat until application "iTerm" is running
      delay 0.1
    end repeat

    ${location === "new-window" ? openInNewWindow() : openWindowIfNone()}
    ${location === "new-tab" ? openInNewTab() : ""}

    tell current session of ${WINDOW_VAR_NAME}
        write text "${escaped}"
    end tell
    activate
  end tell`;
};

export const useItermCommand = (opts: ItermCommandOpts): Result => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [success, setSuccess] = useState(false);
  const script = useMemo(() => makeScript(opts), [opts]);

  useEffect(() => {
    runAppleScript(script)
      .then(() => setSuccess(true))
      .catch((e) => setError(e));
  }, [script]);

  useEffect(() => {
    if (error || success) {
      setLoading(false);
    }
  }, [error, success]);

  return { loading, error, success };
};
