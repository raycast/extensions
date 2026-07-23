import { AccountForm } from "./account-form";
import {
  CommitSoundAccount,
  installOrRepairHook,
  upsertSoundRule,
} from "./lib/commit-sounds";

async function addOrReplaceRule(account: CommitSoundAccount): Promise<void> {
  await installOrRepairHook();
  await upsertSoundRule(account);
}

export default function AddCommitSound() {
  return <AccountForm title="Add Commit Sound" onSaved={addOrReplaceRule} />;
}
