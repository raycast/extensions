import { ActionPanel, ActionPanelSection, CopyToClipboardAction, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { generateTOTP, Options } from "./totp";
import * as fs from "fs";
import * as path from "path";
import * as ini from "ini";

const CONFIG_FILE = "~/.gauth";
const DEFAULT_OPTIONS: Options = {
  digits: 6,
  algorithm: "SHA1",
  period: 30,
};

const configFile = resolveHome(CONFIG_FILE);

export default function AppsView() {
  const [apps, setApps] = useState<
    {
      name: string;
      key: string;
      code: string;
    }[]
  >([]);

  useEffect(() => {
    fs.readFile(configFile, (err, buff) => {
      if (err) {
        console.log(err);
        return;
      }

      const config = ini.parse(buff.toString());

      setApps(
        Object.keys(config)
          .sort((a, b) => a.localeCompare(b))
          .map((name) => {
            const token: { secret: string; options: Options } = {
              secret: config[name].secret,
              options: DEFAULT_OPTIONS,
            };
            return {
              name,
              key: name,
              code: generateTOTP(token.secret, token.options).toString().padStart(token.options.digits, "0"),
            };
          })
      );
    });
  }, []);

  return (
    <List>
      {apps.map((a) => (
        <List.Item
          title={a.name}
          subtitle={a.code}
          key={a.name}
          actions={
            <ActionPanel>
              <ActionPanelSection>
                <CopyToClipboardAction content={a.code} title="Copy Code" />
              </ActionPanelSection>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function resolveHome(filepath: string): string {
  if (filepath[0] === "~") {
    return path.join(process.env.HOME == undefined ? '' : process.env.HOME, filepath.slice(1));
  }
  return filepath;
}
