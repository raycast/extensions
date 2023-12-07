import { exec } from "child_process";
import React, { useEffect, useState } from "react";

export async function setMacOSIcon(appPath: string, imagePath: string) {
  return new Promise((resolve, reject) => {
    try {
      exec(
        `
        replace_icon(){
          droplet="$1"
          icon="$2"
          if [[ "$icon" =~ ^https?:// ]]; then
              curl -sLo /tmp/icon "$icon"
              icon=/tmp/icon
          fi
          rm -rf "$droplet"$'/Icon\r'
          sips -i "$icon" >/dev/null
          DeRez -only icns "$icon" > /tmp/icns.rsrc
          Rez -append /tmp/icns.rsrc -o "$droplet"$'/Icon\r'
          SetFile -a C "$droplet"
          SetFile -a V "$droplet"$'/Icon\r'
          killall Dock
        }; replace_icon '${appPath}' '${imagePath}'
      `,
        (error: unknown, stdout: string) => {
          if (error) {
            console.error(`exec error: ${error}`);
            reject(error);
          }
          resolve(stdout);
        },
      );
    } catch (e) {
      console.error(e);
    }
  });
}

// if `turbo = true` then function doesn't debounce empty value and executes instantly
export function useDebounce<T>(
  initialValue: T,
  delay?: number,
  turbo = true,
): {
  debouncedValue: T;
  rawValue: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
} {
  const [rawValue, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(rawValue);

  useEffect(() => {
    if (turbo && !rawValue) {
      setDebouncedValue(rawValue);
      return;
    }

    const timer = setTimeout(() => setDebouncedValue(rawValue), delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [rawValue, delay]);

  return { debouncedValue, rawValue, setValue };
}
