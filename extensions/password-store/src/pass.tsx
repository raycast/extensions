import {
  List,
  Action,
  ActionPanel,
  Icon,
  getPreferenceValues,
  confirmAlert,
  Form,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { glob } from "glob";
import { getOptionIcon, getPasswordIcon } from "./utils/icons.util";
import { getLastUsedPassword } from "./utils/password.util";
import { runCmd, runPassCmd, validatePassArg } from "./utils/cmd.util";
import { performAction } from "./utils/action.util";
import { Option, Password, PasswordMakerProps, InsertPasswordForm, RenamePasswordProps } from "./interfaces";
import url from "url";

export function RenamePasswordPrompt({ onPasswordRename, oldName }: RenamePasswordProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ renamed: string }>({
    onSubmit: async function (toBeSubmitted) {
      try {
        validatePassArg(toBeSubmitted.renamed);

        // optimistic update - remove the old entry
        const cmdPromise = runPassCmd(["mv", "--", oldName, toBeSubmitted.renamed]);
        onPasswordRename(cmdPromise, {
          optimisticUpdate(data) {
            return data ? data.filter((pass) => pass.value !== oldName) : [];
          },
        });

        await cmdPromise;
        await showToast({ style: Toast.Style.Success, title: "Password renamed" });
        pop();
      } catch (error: unknown) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to rename password", message: String(error) });
      }
    },
    validation: {
      renamed: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Password" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Rename To" {...itemProps.renamed} />
    </Form>
  );
}

/** A component to prompt the user to insert a new password with additional metadata */
export function InsertPasswordPrompt({ onPasswordCreate }: PasswordMakerProps) {
  // used for popping back to the list view after submitting
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<InsertPasswordForm>({
    onSubmit: async function (toBeSubmitted) {
      try {
        validatePassArg(toBeSubmitted.passwordPath);
        const input = `${toBeSubmitted.password}\n${toBeSubmitted.metadata ?? ""}\n`;

        await onPasswordCreate(runPassCmd(["insert", "-m", "--", toBeSubmitted.passwordPath], input));
        await showToast({ style: Toast.Style.Success, title: "Password inserted" });
        pop();
      } catch (error: unknown) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to insert password", message: String(error) });
      }
    },
    validation: {
      passwordPath: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Insert New Password" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Path" {...itemProps.passwordPath} />
      <Form.PasswordField title="Password" {...itemProps.password} />
      <Form.TextArea title="Metadata" {...itemProps.metadata} />
    </Form>
  );
}

/** A component to prompt the user to generate a new password */
export function GeneratePasswordPrompt({ onPasswordCreate }: PasswordMakerProps) {
  // used for popping back to the list view after submitting
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ passwordPath: string }>({
    onSubmit: async function (toBeSubmitted) {
      try {
        validatePassArg(toBeSubmitted.passwordPath);

        await onPasswordCreate(runPassCmd(["generate", "--", toBeSubmitted.passwordPath]));
        await showToast({ style: Toast.Style.Success, title: "Password generated" });
        pop();
      } catch (error: unknown) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to generate password", message: String(error) });
      }
    },
    validation: {
      passwordPath: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Password" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Password Path" {...itemProps.passwordPath} />
    </Form>
  );
}

/**
 * Command component that displays a list of passwords, with the last used password at the top if available.
 *
 * @returns {JSX.Element} The rendered component.
 */
export default function Command(): JSX.Element {
  // move `preferences` here in order to access user preferences values
  const preferences = getPreferenceValues();
  const { isLoading, data, mutate } = usePromise(async () => {
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
          actions={
            <ActionPanel>
              <Action.Push
                title="Generate Password"
                icon={Icon.Key}
                target={<GeneratePasswordPrompt onPasswordCreate={mutate} />}
              />
              <Action.Push
                title="Insert Password"
                icon={Icon.Plus}
                target={<InsertPasswordPrompt onPasswordCreate={mutate} />}
              />
            </ActionPanel>
          }
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
                  icon={Icon.Hashtag}
                  target={<PasswordOptions selectedPassword={password.value} showOtpFirst={password.showOtpFirst} />}
                />
                <Action.Push
                  title="Generate Password"
                  icon={Icon.Key}
                  target={<GeneratePasswordPrompt onPasswordCreate={mutate} />}
                />
                <Action.Push
                  title="Insert Password"
                  icon={Icon.Plus}
                  target={<InsertPasswordPrompt onPasswordCreate={mutate} />}
                />
                <Action.Push
                  title="Rename Password"
                  icon={Icon.Pencil}
                  target={<RenamePasswordPrompt onPasswordRename={mutate} oldName={password.value} />}
                />
                <Action
                  title="Delete Password"
                  icon={Icon.DeleteDocument}
                  onAction={async () => {
                    const isConfirmed = await confirmAlert({
                      title: "Are you sure you want to delete this password file with its metadata?",
                    });
                    if (!isConfirmed) {
                      return;
                    }

                    try {
                      validatePassArg(password.value);
                      await mutate(runPassCmd(["rm", "--force", "--", password.value]));
                      await showToast({ style: Toast.Style.Success, title: "Password deleted" });
                    } catch (error: unknown) {
                      await showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to delete password",
                        message: String(error),
                      });
                    }
                  }}
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
