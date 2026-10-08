import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { configFileLabel, listConfigFiles, type ConfigFile } from "../mise/config";
import type { MiseLocation } from "../mise/locate";
import { addGlobally, type MiseOperation } from "../mise/operations";

export type InstallTarget = {
  files: ConfigFile[];
  isLoading: boolean;
  failed: boolean;
  target: string;
  setTarget: (target: string) => void;
};

export function useInstallTarget(location: MiseLocation): InstallTarget {
  const files = useCachedPromise(listConfigFiles, [location]);
  const [target, setTarget] = useState("");
  const failed = files.data === undefined && files.error !== undefined;
  return { files: files.data ?? [], isLoading: files.data === undefined && !failed, failed, target, setTarget };
}

export function addGloballyTo(
  tool: string,
  version: string | undefined,
  { configFile, jobs }: { configFile: string; jobs?: number },
): MiseOperation {
  const op = addGlobally(tool, version, { configFile: configFile || undefined, jobs });
  return configFile ? { ...op, successTitle: `${op.successTitle} → ${configFileLabel(configFile)}` } : op;
}

// The dropdown is held back until the config files load because a stored target missing from the
// items would be replaced by the first one. When listing fails it shows mise default without
// touching the stored target, so the next launch can restore it.
export function InstallTargetDropdown({
  files,
  failed,
  onChange,
}: {
  files: ConfigFile[];
  failed: boolean;
  onChange: (target: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Install to" storeValue={!failed} onChange={onChange}>
      <List.Dropdown.Item title="mise default" value="" />
      {files.map((file) => (
        <List.Dropdown.Item key={file.path} title={configFileLabel(file.path)} value={file.path} />
      ))}
    </List.Dropdown>
  );
}

export function UseGloballyIn({ files, onSelect }: { files: ConfigFile[]; onSelect: (configFile: string) => void }) {
  return (
    <ActionPanel.Submenu
      title="Use Globally in…"
      icon={Icon.Folder}
      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
    >
      {files.map((file) => (
        <Action
          key={file.path}
          title={configFileLabel(file.path)}
          icon={Icon.Document}
          onAction={() => onSelect(file.path)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
