export const revalidateAfterMutation = async (revalidate: (() => unknown) | undefined): Promise<void> => {
  try {
    await revalidate?.();
  } catch {
    // The mutation already succeeded; a later cache refresh can retry.
  }
};
