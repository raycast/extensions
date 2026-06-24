export const PASSWORD_MANAGER_URL_PREFIX = "chrome://password-manager/passwords";

export function buildPasswordManagerUrl(query?: string): string {
  const trimmed = query?.trim();

  if (!trimmed) {
    return PASSWORD_MANAGER_URL_PREFIX;
  }

  return `${PASSWORD_MANAGER_URL_PREFIX}?q=${encodeURIComponent(trimmed)}`;
}
