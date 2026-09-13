interface RecoveryPhraseCopyActions {
  confirm: () => Promise<boolean>;
  write: (content: string, options: { concealed: true }) => Promise<void>;
}

export async function confirmAndCopyRecoveryPhrase(
  mnemonic: string,
  actions: RecoveryPhraseCopyActions,
): Promise<boolean> {
  const confirmed = await actions.confirm();

  if (!confirmed) return false;

  await actions.write(mnemonic, { concealed: true });
  return true;
}
