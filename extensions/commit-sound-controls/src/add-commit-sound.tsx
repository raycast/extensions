import { AccountForm } from "./account-form";
import { confirmAndInstallHook } from "./confirm-hook-install";
import { CommitSoundAccount, upsertSoundRule } from "./lib/commit-sounds";

async function addOrReplaceRule(account: CommitSoundAccount): Promise<void> {
  await confirmAndInstallHook();
  await upsertSoundRule(account);
}

export default function AddCommitSound() {
  return <AccountForm title="Add Commit Sound" onSaved={addOrReplaceRule} />;
}
