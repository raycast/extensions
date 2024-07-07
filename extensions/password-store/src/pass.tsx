import { List, Action, ActionPanel, Icon, closeMainWindow, Clipboard, getPreferenceValues, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "node:util";
import { glob } from "glob";
import os from "os";
import { getOptionIcon, getPasswordIcon } from "./utils/icons";
import { getLastUsedPassword, updateLastUsedPassword } from "./utils/lastUsedPassword";
import url from 'url';

const execPromise = promisify(exec);

const SHELL_PREFIX = "export PATH=$PATH:/opt/homebrew/bin &&"; // Needed for the 'pass' command to work on M1 Mac
const PASSWORDS_PATH = `${os.homedir()}/.password-store/`;

interface Password {
  value: string;
  showOtpFirst?: boolean;
}

interface Preferences {
  GPG_KEY?: string;
}

/**
 * Command component that displays a list of passwords, with the last used password at the top if available.
 *
 * @returns {JSX.Element} The rendered component.
 */
export default function Command(): JSX.Element {
  const { isLoading, data } = usePromise(async () => {
    // Info about the last used password
    const lastUsedPassword = await getLastUsedPassword();

    // Initialize the passwords array with the last used password if it exists
    const passwords: Password[] = lastUsedPassword.password
      ? [
          {
            value: lastUsedPassword.password,
            showOtpFirst: lastUsedPassword.option === "Password",
          },
        ]
      : [];

    // Get all password files
    const files = await glob(`${PASSWORDS_PATH}**/*.gpg`);

    // Add each password to the list, excluding the last used password
    files.sort().forEach((file) => {
      const password = file.replace(PASSWORDS_PATH, "").replace(".gpg", "");
      if (password !== lastUsedPassword.password) passwords.push({ value: password });
    });

    return passwords;
  });

  return (
    <List isLoading={isLoading}>
      {data?.map((password: Password) => (
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
      ))}
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
    // Get the decrypted contents of the file
    // Run command to get decrypted contents of the file
    const preferences = getPreferenceValues<Preferences>();
    const gpgKey = preferences.GPG_KEY;

    const cmdOptions = gpgKey ? `--pinentry-mode=loopback --passphrase "${gpgKey}"` : '';
    const stdout = await runCmd(`gpg ${cmdOptions} -d ${PASSWORDS_PATH}${selectedPassword}.gpg`);

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
  });

  return (
    <List isLoading={isLoading}>
      {data?.map((option: { title: string; value: string }) => (
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
      ))}
    </List>
  );
}

/**
 * Performs an action (copy or paste) with the specified password option and updates the last used password.
 *
 * @param {string} selectedPassword - The selected password entry.
 * @param {{ title: string, value: string }} option - The option object containing the title and value.
 * @param {'copy' | 'paste'} action - The action to perform, either 'copy' or 'paste'.
 * @returns {Promise<void>} A promise that resolves when the action is complete.
 */
async function performAction(
  selectedPassword: string,
  option: { title: string; value: string },
  action: "copy" | "paste",
): Promise<void> {
  try {
    // Update the last used password file
    await updateLastUsedPassword(selectedPassword, option.title);

    // Perform the specified action (copy or paste) with the option value
    await Clipboard[action](option.value);

    // Close the main window and clear the root search
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    // Log any errors that occur during the action
    console.error("Error performing action:", error);
  }
}

/**
 * Executes a shell command and returns the standard output.
 *
 * @param {string} cmd - The command to execute.
 * @returns {Promise<string>} A promise that resolves to the standard output of the executed command.
 */
async function runCmd(cmd: string): Promise<string> {
  try {
    // Execute the command and wait for the result
    const { stdout } = await execPromise(`${SHELL_PREFIX} ${cmd}`, { shell: "/bin/zsh" });

    // Return the standard output
    return stdout;
  } catch (error) {
    // Log the error and rethrow it
    console.error("Error executing command:", error);
    throw error;
  }
}
