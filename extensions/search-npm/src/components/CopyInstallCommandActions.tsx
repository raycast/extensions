import type { Keyboard } from "@raycast/api";
import { Action, getPreferenceValues } from "@raycast/api";
import type { ExtensionPreferences } from "@/types";

type Registries = "yarn" | "npm" | "pnpm" | "bun";
interface RegistryItem {
  name: string;
  registry: Registries;
  installCommand: string;
}
const registries: RegistryItem[] = [
  {
    name: "Yarn",
    registry: "yarn",
    installCommand: "add",
  },
  {
    name: "npm",
    registry: "npm",
    installCommand: "install",
  },
  {
    name: "pnpm",
    registry: "pnpm",
    installCommand: "install",
  },
  {
    name: "bun",
    registry: "bun",
    installCommand: "add",
  },
];

const defaultShortcut: Keyboard.Shortcut = {
  macOS: {
    key: "c",
    modifiers: ["shift", "cmd"],
  },
  Windows: {
    key: "c",
    modifiers: ["shift", "ctrl"],
  },
};
const alternateShortcut: Keyboard.Shortcut = {
  macOS: {
    key: "c",
    modifiers: ["opt", "cmd"],
  },
  Windows: {
    key: "c",
    modifiers: ["alt", "ctrl"],
  },
};

interface CopyInstallCommandActionsProps {
  packageName: string;
}
export const CopyInstallCommandActions = ({ packageName }: CopyInstallCommandActionsProps) => {
  const { defaultCopyAction, secondaryCopyAction } = getPreferenceValues<ExtensionPreferences>();

  const copyActions = registries
    .sort((a) => {
      const isPrimary = defaultCopyAction === a.registry;
      const isSecondary = secondaryCopyAction === a.registry;
      if (isPrimary) {
        return -1;
      } else if (isSecondary) {
        return 0;
      } else {
        return 1;
      }
    })
    .map(({ name, registry, installCommand }) => {
      const isPrimary = defaultCopyAction === registry;
      const isSecondary = secondaryCopyAction === registry;
      const title = `Copy ${name} Install Command`;
      const shortcut = isPrimary ? defaultShortcut : isSecondary ? alternateShortcut : undefined;
      return (
        <Action.CopyToClipboard
          title={title}
          content={`${registry} ${installCommand} ${packageName}`}
          shortcut={shortcut}
          key={registry}
        />
      );
    });

  return <>{copyActions}</>;
};
