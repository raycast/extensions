import { getKeychainItem } from "@/lib/authcli";

export const DASHLANE_KEYCHAIN_KEY_NAME = "dashlane-vault-master-password";

export const getMasterPassword = async (): Promise<string | null> => {
  const password = await getKeychainItem(DASHLANE_KEYCHAIN_KEY_NAME);

  if (!password) {
    return null;
  }
  return password;
};
