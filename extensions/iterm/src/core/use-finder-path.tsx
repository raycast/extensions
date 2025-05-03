import { runAppleScript } from "run-applescript";
import { useEffect, useState } from "react";

interface Result {
  path: string;
  error?: Error;
}

export const finderPathScript = `
tell application "Finder"
    return POSIX path of (target of front Finder window as alias)
end tell
`;

export const useFinderPath = (): Result => {
  const [path, setPath] = useState<string>("");
  const [error, setError] = useState<Error>();

  useEffect(() => {
    runAppleScript(finderPathScript)
      .then((path) => setPath(path))
      .catch(() => setError(new Error("Finder not running")));
  }, []);

  return { path, error };
};
