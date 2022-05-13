import { open } from "@raycast/api";
import { homedir } from "os";
import { OnePassword } from "./types";

const onePassword: OnePassword = {
  // This is the default location of `opbookmarks`. @see https://github.com/dteare/opbookmarks
  metadataFolder: `${homedir()}/.config/op/bookmarks`,
  installationGuide: `
# Enable the 1Password command-line tool to use
To use this extension please install the 1Password CLI and run \`opbookmarks\`.
1. Make sure you using 1Password 8
1. Install the [1Password CLI](https://developer.1password.com/docs/cli)
1. Open and unlock 1Password
1. Choose 1Password > Preferences > Developers and enable CLI integration
1. Use [opbookmarks](https://github.com/dteare/opbookmarks) to export your item metadata

## 1Password item data

This extension has restricted access to your 1Password data. Only the metadata files created by 

\`opbookmarks\` are used. These metadata files include the following information about each item:
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

    const url = `${website}/?w65dshuxxsfsqfmruhggbd7v2i=${metaItem.uuid}`;
    await open(url);
  },
  edit: async (metaItem) => {
    const url = `onepassword://edit-item/?a=${metaItem.profileUUID}&v=${metaItem.vaultUUID}&i=${metaItem.uuid}`;
    await open(url, "com.1password.1password");
  },
  view: async (metaItem) => {
    const url = `onepassword://view-item/?a=${metaItem.profileUUID}&v=${metaItem.vaultUUID}&i=${metaItem.uuid}`;
    await open(url, "com.1password.1password");
  },
};

export default onePassword;
