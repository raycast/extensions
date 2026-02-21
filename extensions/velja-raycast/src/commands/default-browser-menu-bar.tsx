import { MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";
import { readVeljaConfig } from "../lib/velja";
import { getBrowserIcon, getBrowserTitle } from "../lib/browsers";

function getMenuBarTitle(identifier?: string): string {
  if (!identifier) {
    return "Velja";
  }

  const title = getBrowserTitle(identifier);
  if (title.length <= 20) {
    return title;
  }

  return `${title.slice(0, 17)}...`;
}

export default function Command() {
  const [defaultBrowser, setDefaultBrowser] = useState<string | undefined>(() => readVeljaConfig().defaultBrowser);

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const config = readVeljaConfig();
        setDefaultBrowser(config.defaultBrowser);
      } catch {
        setDefaultBrowser(undefined);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const title = getMenuBarTitle(defaultBrowser);

  return (
    <MenuBarExtra icon={getBrowserIcon(defaultBrowser ?? "")} title={title}>
      <MenuBarExtra.Item title={`Default: ${getBrowserTitle(defaultBrowser ?? "")}`} />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          onAction={() => {
            try {
              setDefaultBrowser(readVeljaConfig().defaultBrowser);
            } catch {
              setDefaultBrowser(undefined);
            }
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
