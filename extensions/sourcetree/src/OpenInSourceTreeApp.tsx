import { Action, popToRoot, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { Repository } from "./lib/repository";
import { Preferences } from "./lib/preferences";

interface OpenInSourceTreeAppProps {
  repo: Repository;
}

const bin = Preferences.get().bin;

export function OpenInSourceTreeApp({ repo }: OpenInSourceTreeAppProps) {
  async function handleAction() {
    const cmd = `${bin} ${repo.path}`;

    await showToast(Toast.Style.Animated, `Opening ${repo.name}`);

    try {
      execSync(cmd, { env: {} });
      await popToRoot();
    } catch (error) {
      console.log(error);
      await showToast(Toast.Style.Failure, `Error opening ${repo.name}`);
    }
  }

  return <Action title={`Open with Sourcetree`} icon="sourcetree_256x256x32.png" onAction={handleAction} />;
}
