import { getKeychainItem } from "@/lib/authcli";
import { LocalStorage } from "@raycast/api";

export const findDashlaneKey = async () => {
    const allKeys = await LocalStorage.allItems();
    return Object.keys(allKeys).find((key) => key.includes("dashlane-vault-master-password"));
};

export const getMasterPassword = async (): Promise<string | null> => {
    const keyName = await findDashlaneKey();
    if (!keyName) {
        return null;
    }
    const password = await getKeychainItem(keyName!);
    if (!password) {
        return null
    }
    return password;
}
