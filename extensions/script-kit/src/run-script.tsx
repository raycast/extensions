import {
  Action,
  ActionPanel,
  Icon,
  LaunchProps,
  List,
  Toast,
  closeMainWindow,
  popToRoot,
  showToast,
} from "@raycast/api";
import { execa } from "execa";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";
import { useEffect, useState } from "react";
import { Script } from "./script";

const kit_path = resolve(homedir(), ".kit");
const kar_path = resolve(kit_path, "kar");

export default function listScripts(props: LaunchProps) {
  const [scripts, setScripts] = useState<Script[]>();
  useEffect(() => {
    const script_db_path = resolve(kit_path, "db", "scripts.json");
    readFile(script_db_path)
      .then((buffer) => buffer.toString())
      .then(JSON.parse)
      .then((json) => setScripts(json.scripts));
  }, []);

  if (props.launchContext?.scriptPath) {
    popToRoot();
    closeMainWindow();
    execa("/bin/bash", [kar_path, props.launchContext.scriptPath]);
    return null;
  }

  return (
    <List isLoading={typeof scripts == "undefined"}>
      {scripts
        ?.filter((script) => !script.exclude)
        .map((script) => (
          <List.Item
            title={script.name}
            key={script.command}
            subtitle={script.description}
            accessories={[{ text: script.kenv }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <RunScriptAction scriptPath={script.filePath} />
                  <Action.CreateQuicklink
                    quicklink={{
                      name: script.name,
                      link: `raycast://extensions/pomdtr/script-kit/run-script?context=${encodeURIComponent(
                        JSON.stringify({
                          scriptPath: script.filePath,
                        }),
                      )}`,
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <NewScriptAction />
                  <NewScriptFromUrlAction />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <ShareScriptAsGistAction scriptPath={script.filePath} />
                  <EditScriptAction scriptPath={script.filePath} />
                  <DeleteScriptAction scriptPath={script.filePath} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function DeleteScriptAction(props: { scriptPath: string }) {
  return (
    <RunScriptAction
      title="Remove Script"
      icon={Icon.Trash}
      scriptPath={resolve(kit_path, "cli", "remove.js")}
      args={[props.scriptPath]}
    />
  );
}

function NewScriptAction() {
  return <RunScriptAction title="New Script" icon={Icon.Plus} scriptPath={resolve(kit_path, "cli", "new.js")} />;
}

function NewScriptFromUrlAction() {
  return (
    <RunScriptAction
      title="New Script from Url"
      icon={Icon.Link}
      scriptPath={resolve(kit_path, "cli", "new-from-url.js")}
    />
  );
}

function ShareScriptAsGistAction(props: { scriptPath: string }) {
  return (
    <RunScriptAction
      title="Share Script as Gist"
      icon={Icon.Upload}
      scriptPath={resolve(kit_path, "cli", "share-script.js")}
      args={[props.scriptPath]}
    />
  );
}

function EditScriptAction(props: { scriptPath: string }) {
  return (
    <RunScriptAction
      title="Edit Script"
      icon={Icon.Pencil}
      scriptPath={resolve(kit_path, "cli", "edit.js")}
      args={[props.scriptPath]}
    />
  );
}

function RunScriptAction(props: { scriptPath: string; icon?: Icon; title?: string; args?: string[] }) {
  return (
    <Action
      title={props.title || "Run Script"}
      icon={props.icon || Icon.Terminal}
      onAction={async () => {
        try {
          await execa("/bin/bash", [kar_path, props.scriptPath, ...(props.args || [])]);
          await closeMainWindow();
          await popToRoot();
        } catch (error) {
          showToast(Toast.Style.Failure, "Could not connect to Kit", "Please check that Kit is running");
        }
      }}
    />
  );
}
