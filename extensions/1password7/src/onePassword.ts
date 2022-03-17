import { homedir } from "os";
import { join } from "path";

// This is the official location, see for more information https://support.1password.com/integration-mac/
export const ONE_PASSWORD_7_CLI_FOLDER = join(
  homedir(),
  "/Library/Containers/com.agilebits.onepassword7/Data/Library/Caches/Metadata/1Password"
);

export const CLI_REQUIRED_MESSAGE = `
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
- item identifier`;
