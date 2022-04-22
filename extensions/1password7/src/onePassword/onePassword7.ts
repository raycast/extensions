import { open } from "@raycast/api";
import { homedir } from "os";
import shajs from "sha.js";
import { OnePassword } from "./types";

const onePassword: OnePassword = {
  // This is the official location, see for more information https://support.1password.com/integration-mac/
  metadataFolder: `${homedir()}/Library/Containers/com.agilebits.onepassword7/Data/Library/Caches/Metadata/1Password`,
  installationGuide: `
# Spotlight and 3rd party app integrations is not enabled

To use this extension please enable the "Spotlight and 3rd party app integrations" in the 1Password 7 app;
1. Make sure you have the right 1Password app version, it should be 7.
2. Open and unlock 1Password.
3. Choose 1Password > Preferences and click the Advanced icon.
4. Turn on “Enable Spotlight and 3rd party app integrations”.
5. Restart 1Password app.

## This extension has no access to your passwords only to the metadata
The metadata includes the following information about each item:
- title
- description
- URLs
- vault name
- item category
- account name
- vault identifier
- item identifier`,
  openAndFill: async (metaItem) => {
    const website = metaItem.websiteURLs?.[0];
    if (!website) {
      throw Error(`No website found for item ${metaItem.itemTitle}`);
    }

    const hashedUrl = shajs("sha256").update(website).digest("hex");
    const url = `onepassword7://open_and_fill/${metaItem.vaultUUID}/${metaItem.uuid}/${hashedUrl}`;
    await open(url, "com.agilebits.onepassword7");
  },
  edit: async (metaItem) => {
    const url = `onepassword7://edit/${metaItem.vaultUUID}/${metaItem.uuid}`;
    await open(url, "com.agilebits.onepassword7");
  },
  view: async (metaItem) => {
    const url = `onepassword7://view/${metaItem.vaultUUID}/${metaItem.uuid}`;
    await open(url, "com.agilebits.onepassword7");
  },
};

export default onePassword;
