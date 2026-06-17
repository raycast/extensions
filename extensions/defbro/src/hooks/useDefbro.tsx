import { useState, useEffect } from "react";
import { existsSync } from "fs";
import execPromise from "../utils/execPromise";

const POSSIBLE_PATHS = [
  "/opt/homebrew/bin/defbro",
  "/usr/local/bin/defbro",
  "/usr/bin/defbro",
  "/bin/defbro",
  "/opt/local/bin/defbro",
  "/home/linuxbrew/.linuxbrew/bin/defbro",
  "/usr/local/opt/defbro/bin/defbro",
];

export function useDefbro() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [defbroPath, setDefbroPath] = useState<string | null>(null);

  useEffect(() => {
    const findDefbro = async () => {
      // First try using 'which' command
      try {
        const { stdout } = await execPromise("which defbro");
        const path = stdout.trim();
        if (path && existsSync(path)) {
          // Verify it actually works
          await execPromise(`${path} --help`);
          setDefbroPath(path);
          setIsInstalled(true);
          return;
        }
      } catch {
        // 'which' command failed, continue with manual search
      }

      // Fall back to checking common installation paths
      for (const path of POSSIBLE_PATHS) {
        if (existsSync(path)) {
          try {
            await execPromise(`${path} --help`);
            setDefbroPath(path);
            setIsInstalled(true);
            return;
          } catch {
            // Path exists but execution failed, continue searching
          }
        }
      }

      // Not found anywhere
      setDefbroPath(null);
      setIsInstalled(false);
    };

    findDefbro();
  }, []);

  return { isInstalled, defbroPath };
}
