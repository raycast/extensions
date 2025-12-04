import { List, Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { glob } from "glob";
import { getOptionIcon, getPasswordIcon } from "./utils/icons.util";
import { getLastUsedPassword } from "./utils/password.util";
import { runCmd } from "./utils/cmd.util";
import { performAction } from "./utils/action.util";
import { Option, Password } from "./interfaces";
import url from "url";

/**
 * Command component that displays a list of passwords, with the last used password at the top if available.
 *
 * @returns {JSX.Element} The rendered component.
 */
export default function Command(): JSX.Element {
  const { isLoading, data } = usePromise(async () => {
    // Info about the last used password
    const lastUsedPassword = await getLastUsedPassword();

    // Initialize the passwords array
    const passwords: Password[] = [];

    // Push the last used password if it exists
    if (lastUsedPassword.password)
      passwords.push({
        value: lastUsedPassword.password,
        showOtpFirst: lastUsedPassword.option === "Password",
      });

    const preferences = getPreferenceValues();
    const passPath = preferences.PASSWORDS_PATH;

    // Get all password files
    const files = await glob(`${passPath}/**/*.gpg`);

    // Add each password to the list, excluding the last used password
    files.sort().forEach((file) => {
      const password = file.replace(`${passPath}/`, "").replace(".gpg", "");
      if (password !== lastUsedPassword.password) passwords.push({ value: password });
    });

    return passwords;
  });

  return (
    <List isLoading={isLoading}>
      {data && data.length === 0 ? (
        <List.EmptyView
          title="No password files found"
          description="Please check that you have the correct folder selected in your extension preferences. "
        />
      ) : (
        data?.map((password: Password) => (
          <List.Item
            icon={getPasswordIcon(password.value)}
            title={password.value}
            key={password.value}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Decrypt"
                  target={<PasswordOptions selectedPassword={password.value} showOtpFirst={password.showOtpFirst} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

/**
 * Component for displaying and handling password options.
 *
 * @param {{ selectedPassword: string, showOtpFirst: boolean | undefined }} props - The properties for the component.
 * @returns {JSX.Element} The rendered component.
 */
function PasswordOptions(props: { selectedPassword: string; showOtpFirst: boolean | undefined }): JSX.Element {
  const { selectedPassword, showOtpFirst } = props;

  const { isLoading, data } = usePromise(async () => {
    try {
      // Get the decrypted contents of the file
      // Run command to get decrypted contents of the file
      const preferences = getPreferenceValues();
      const gpgKey = preferences.GPG_KEY;
      const passPath = preferences.PASSWORDS_PATH;

      const cmdOptions = gpgKey ? `--pinentry-mode=loopback --passphrase "${gpgKey}"` : "";
      const cmd = `gpg ${cmdOptions} -d ${passPath}/${selectedPassword}.gpg`;
      const stdout = await runCmd(cmd);

      // Split the output into lines
      const passwordOptions = stdout.split("\n");

      // Get the password value (first line of the decrypted file)
      const passwordValue = passwordOptions.shift();

      // Initialize the options array
      const options = passwordValue ? [{ title: "Password", value: passwordValue }] : [];

      // Process each line in the decrypted file
      for (const option of passwordOptions) {
        // If line is not empty
        if (option) {
          // Check if the line follows the "Key: Value" pattern
          const elements = option.split(": ");
          if (elements.length === 2) {
            // If it does, add an entry with the Key as a title and the Value as the value
            options.push({ title: elements[0], value: elements[1] });
          } else if (option.startsWith("otpauth://")) {
            // Check if the line is an OTP entry
            const otpUrl = url.parse(option, true);
            const otpSecret = otpUrl.query.secret;
            const otpValue = await runCmd(`oathtool -b --totp ${otpSecret}`);

            // Push OTP option as the first or second option, depending on the 'showOtpFirst' variable
            options.splice(showOtpFirst ? 0 : 1, 0, { title: "OTP", value: otpValue });
          }
        }
      }

      return options;
    } catch (error: unknown) {
      return false;
    }
  });

  return (
    <List isLoading={isLoading}>
      {!data ? (
        <List.EmptyView
          title="Error decrypting password"
          description="There was an error while decrypting the password file. Make sure your GPG password is saved on your macOS keychain or in the extension preferences."
        />
      ) : (
        data?.map((option: Option) => (
          <List.Item
            icon={getOptionIcon(option.title)}
            title={option.title}
            key={option.title}
            actions={
              <ActionPanel>
                <Action
                  title="Autofill"
                  icon={Icon.Keyboard}
                  onAction={async () => await performAction(selectedPassword, option, "paste")}
                />
                <Action
                  title="Copy to clipboard"
                  icon={Icon.CopyClipboard}
                  onAction={async () => await performAction(selectedPassword, option, "copy")}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
