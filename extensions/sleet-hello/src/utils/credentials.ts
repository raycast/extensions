import { homedir } from "os";
import { join } from "path";
import { readFileSync, readdirSync } from "fs";
import { KeyPairString } from "near-api-js/lib/utils/key_pair";

export interface AccountCredentials {
  account_id: string;
  public_key: string;
  private_key: KeyPairString;
}

export async function getCredentials(): Promise<AccountCredentials | null> {
  try {
    const { networkId } = await import("./config").then((m) => m.getNetworkConfig());
    const accounts = getAvailableAccounts(networkId);

    if (accounts.length === 0) {
      return null;
    }

    // Return the first available account
    return accounts[0];
  } catch (error) {
    console.error("Error getting credentials:", error);
    return null;
  }
}

export function getAvailableAccounts(networkId: string): AccountCredentials[] {
  try {
    const credentialsPath = join(homedir(), ".near-credentials", networkId);
    const files = readdirSync(credentialsPath);

    const accounts: AccountCredentials[] = [];

    files.forEach((file) => {
      if (file.endsWith(".json")) {
        try {
          const accountId = file.slice(0, -5); // Remove .json extension
          const filePath = join(credentialsPath, file);
          const content = readFileSync(filePath, "utf8");
          const rawCredentials = JSON.parse(content);

          // Extract only needed fields
          const credentials: AccountCredentials = {
            account_id: accountId,
            private_key: rawCredentials.private_key,
            public_key: rawCredentials.public_key,
          };

          accounts.push(credentials);
        } catch (error) {
          console.error(`Error reading credentials file ${file}:`, error);
        }
      }
    });

    return accounts;
  } catch (error) {
    console.error("Error reading credentials directory:", error);
    return [];
  }
}
