import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getSkillPath, setSkillPath, type SkillCommand } from "./storage";
import { skillPathToName } from "./task-manager";
import { dirFromPath } from "./git-utils";

const COMMAND_LABELS: Record<SkillCommand, string> = {
  "git-push": "Git Push",
  "create-pr": "Create PR",
  "review-pr": "Review PR",
};

async function pickSkillFile(commandLabel?: string): Promise<string | null> {
  const { execFileSync } = await import("child_process");
  const { existsSync } = await import("fs");
  const { homedir } = await import("os");
  const { join } = await import("path");

  const home = homedir();
  const claudeDir = join(home, ".claude");
  const defaultDir = existsSync(claudeDir) ? claudeDir : home;
  const prompt = commandLabel
    ? `Select a .md skill file for ${commandLabel}`
    : "Select a .md skill file";

  try {
    const script = `
on run argv
  set dialogPrompt to item 1 of argv
  set defaultDir to POSIX file (item 2 of argv)
  return POSIX path of (choose file with prompt dialogPrompt of type {"md"} default location defaultDir)
end run
`;
    const selected = execFileSync(
      "osascript",
      ["-e", script, prompt, defaultDir],
      {
        encoding: "utf-8",
        timeout: 30000,
      },
    ).trim();
    return selected || null;
  } catch {
    return null;
  }
}

export { pickSkillFile };

export interface SkillConfig {
  skillName: string;
  skillDir: string;
}

interface SkillGateProps {
  command: SkillCommand;
  children: (config: SkillConfig) => React.ReactNode;
}

export function SkillGate({ command, children }: SkillGateProps) {
  const [config, setConfig] = useState<SkillConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const path = await getSkillPath(command);
      if (path) {
        setConfig(skillPathToConfig(path));
      }
      setIsLoading(false);
    })();
  }, [command]);

  if (isLoading) {
    return <List isLoading />;
  }

  if (config) {
    return <>{children(config)}</>;
  }

  return (
    <SkillPrompt command={command} onConfigured={(cfg) => setConfig(cfg)} />
  );
}

function skillPathToConfig(path: string): SkillConfig {
  const name = skillPathToName(path);
  const dir = dirFromPath(path);
  return { skillName: name, skillDir: dir };
}

function SkillPrompt({
  command,
  onConfigured,
}: {
  command: SkillCommand;
  onConfigured: (config: SkillConfig) => void;
}) {
  const label = COMMAND_LABELS[command];

  async function handleSelect() {
    const path = await pickSkillFile(label);
    if (!path) return;

    const name = skillPathToName(path);
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid skill file",
      });
      return;
    }

    await setSkillPath(command, path);
    await showToast({
      style: Toast.Style.Success,
      title: `Skill configured: /${name}`,
    });
    onConfigured(skillPathToConfig(path));
  }

  return (
    <List>
      <List.EmptyView
        icon={Icon.Document}
        title={`No Skill File for ${label}`}
        description="Press Enter to select a .md skill file"
        actions={
          <ActionPanel>
            <Action
              title="Select Skill File"
              icon={Icon.Document}
              onAction={handleSelect}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
