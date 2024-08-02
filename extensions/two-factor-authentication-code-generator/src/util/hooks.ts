import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { generateTOTP, Options, parse } from "./totp";

interface UseAppsOptions {
  doUpdates?: boolean;
}
export function useApps(options?: UseAppsOptions) {
  const [apps, setApps] = useState<
    {
      name: string;
      key: string;
      code: string;
      percent: number;
      time: string;
      secret: string;
      options: Options;
    }[]
  >([]);

  async function updateApps() {
    const _apps = await LocalStorage.allItems();
    setApps(
      Object.keys(_apps)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => {
          const token: { secret: string; options: Options } = parse(_apps[name]);
          return {
            name,
            key: _apps[name].toString(),
            time: `${Math.floor(token.options.period - ((new Date().getTime() / 1000) % token.options.period))}`,
            percent:
              (Math.floor(token.options.period - ((new Date().getTime() / 1000) % token.options.period)) /
                token.options.period) *
              100,
            code: generateTOTP(token.secret, token.options).toString().padStart(token.options.digits, "0"),
            secret: token.secret,
            options: token.options,
          };
        })
    );
  }

  useEffect(() => {
    updateApps();
  }, []);

  useEffect(() => {
    if (options?.doUpdates !== false) {
      updateApps();
      const intervalId = setInterval(updateApps, 100);
      return () => clearInterval(intervalId);
    }
  }, [options?.doUpdates]);

  return { apps, updateApps };
}
