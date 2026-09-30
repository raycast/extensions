import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { generateTOTP, Options, parse } from "./totp";

interface UseAppsOptions {
  doUpdates?: boolean;
}
export interface App {
  name: string;
  key: string;
  code: string;
  percent: number;
  time: string;
  secret: string;
  options: Options;
}

export function useApps(options?: UseAppsOptions) {
  const [apps, setApps] = useState<Array<App>>([]);

  async function updateApps() {
    const _apps = await LocalStorage.allItems();
    setApps(
      Object.keys(_apps)
        .sort((a, b) => {
          const parsedA = parse(_apps[a]).lastTimeUsed ?? 1;
          const parsedB = parse(_apps[b]).lastTimeUsed ?? 1;
          const timeComparison = parsedB - parsedA;
          return timeComparison === 0 ? a.localeCompare(b) : timeComparison;
        })
        .map((name) => {
          const token: { secret: string; options: Options; lastTimeUsed?: number } = parse(_apps[name]);
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
        }),
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
