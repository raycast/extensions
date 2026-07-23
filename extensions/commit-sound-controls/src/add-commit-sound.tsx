import { AccountForm } from "./account-form";
import {
  CommitSoundAccount,
  installOrRepairHook,
  readConfig,
  removeManagedAudio,
  writeConfig,
} from "./lib/commit-sounds";

async function addOrReplaceRule(account: CommitSoundAccount): Promise<void> {
  const config = await readConfig();
  const previous = config.accounts.find((item) => item.owner === account.owner);

  await installOrRepairHook();
  if (previous && previous.soundPath !== account.soundPath) {
    await removeManagedAudio(previous);
  }

  await writeConfig({
    ...config,
    enabled: true,
    accounts: [
      ...config.accounts.filter((item) => item.owner !== account.owner),
      account,
    ],
  });
}

export default function AddCommitSound() {
  return <AccountForm title="Add Commit Sound" onSaved={addOrReplaceRule} />;
}
