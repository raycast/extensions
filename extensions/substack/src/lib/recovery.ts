import type { DraftReference } from "./createDraft";
import { type RecoveryRecord, readState, updateState, validRecovery } from "./storage";
import { publicationOrigin } from "./substackClient";

export type { RecoveryRecord } from "./storage";
export async function listRecovery(accountId?: string): Promise<RecoveryRecord[]> {
  return (await readState()).recovery.filter((r) => r.accountId === accountId);
}
export async function rememberDraft(
  accountId: string,
  title: string,
  draft: DraftReference,
  verified: boolean,
): Promise<void> {
  const record = { ...draft, accountId, title: title.trim(), verified };
  if (!validRecovery(record)) throw new Error("Invalid draft recovery reference.");
  await updateState((state) => {
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account || draft.editorUrl !== `${publicationOrigin(account.publication)}/publish/post/${draft.id}`)
      throw new Error("The draft's connection changed. Keep its recovery URL and inspect it in Substack.");
    state.recovery = [record, ...state.recovery.filter((r) => r.accountId !== accountId || r.id !== draft.id)];
  });
}
