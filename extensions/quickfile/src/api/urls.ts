export const iconPath = (icon: string | null, fallback: string) =>
  icon ? `https://qfstore.blob.core.windows.net/images/bank/logos-sq/${icon}` : fallback;

export const accountPath = (accountSlug: string | undefined, bankId: string | number | undefined) =>
  accountSlug && bankId ? `https://${accountSlug}.quickfile.co.uk/bank/statement?bID=${bankId}` : "";
