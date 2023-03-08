import { ActionPanel, List, Action } from "@raycast/api";
import * as fs from "fs";
import path from "path";
import * as os from "os";
export default function Command() {
  const homeDir = os.homedir();
  const sshKeyRootDir = path.join(homeDir, ".ssh");
  const publicKeys = fs.readdirSync(sshKeyRootDir).filter((file) => file.endsWith(".pub"));

  return (
    <List>
      <List.Section title="SSH Keys">
        {publicKeys.map((key, index) => {
          return (
            <List.Item
              icon="list-icon.png"
              key={key}
              title={key}
              subtitle={path.join(sshKeyRootDir, publicKeys[index])}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy SSH Key"
                    content={fs.readFileSync(path.join(sshKeyRootDir, publicKeys[index]), "utf8")}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
