import { createHash } from "node:crypto";

export type AccountSource = {
  personalToken(): string | undefined;
  readAccountId(): Promise<string | undefined>;
  saveAccountId(id: string): Promise<void>;
  newAccountId(): string;
  underLease<T>(work: () => Promise<T>): Promise<T>;
};

export type SignInFinish = {
  newAccountId(): string;
  saveAccountId(id: string): Promise<void>;
  saveTokens(): Promise<void>;
};

export async function resolveAccount(source: AccountSource): Promise<string> {
  const token = source.personalToken();
  if (token) return `personal:${createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
  const saved = await source.readAccountId();
  if (saved) return `oauth:${saved}`;
  const id = await source.underLease(async () => {
    const minted = await source.readAccountId();
    if (minted) return minted;
    const created = source.newAccountId();
    await source.saveAccountId(created);
    return (await source.readAccountId()) ?? created;
  });
  return `oauth:${id}`;
}

export async function finishSignIn(finish: SignInFinish): Promise<void> {
  await finish.saveAccountId(finish.newAccountId());
  await finish.saveTokens();
}
