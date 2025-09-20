import { Action, ActionPanel, Clipboard, Form, Icon, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { DebuggingBugReportingActionSection } from "~/components/actions";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import VaultListenersProvider from "~/components/searchVault/context/vaultListeners";
import { FOLDER_OPTIONS } from "~/constants/general";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { getPasswordGeneratorOptions } from "./utils/passwords";

type CreateLoginFormValues = {
  name: string;
  username: string;
  visiblePassword: string;
  hiddenPassword: string;
  folderId: string;
  uri: string;
};

const CreateLoginCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider>
      <SessionProvider unlock>
        <VaultListenersProvider>
          <VaultProvider>
            <CreateLoginComponent />
          </VaultProvider>
        </VaultListenersProvider>
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

function CreateLoginComponent() {
  const bitwarden = useBitwarden();
  const { folders } = useVaultContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: CreateLoginFormValues) {
    const toast = await showToast({ title: "Creating Login...", style: Toast.Style.Animated });
    setIsSubmitting(true);
    try {
      const { name, username, visiblePassword, hiddenPassword, folderId, uri } = values;
      const password = showPassword ? visiblePassword : hiddenPassword;
      const effectiveFolderId = folderId === FOLDER_OPTIONS.NO_FOLDER ? null : folderId;
      const { error } = await bitwarden.createLoginItem({
        name,
        username,
        password,
        folderId: effectiveFolderId,
        uri: uri || undefined,
      });
      if (error) throw error;

      toast.style = Toast.Style.Success;
      toast.title = "Login created";
      toast.message = name;
      reset();
      await showHUD(`Login created: ${name}`, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create login";
      toast.message = undefined;
    } finally {
      setIsSubmitting(false);
    }
  }

  const [showPassword, setShowPassword] = useState(false);

  const { itemProps, handleSubmit, setValue, focus, reset } = useForm<CreateLoginFormValues>({
    onSubmit,
    initialValues: {
      name: "",
      username: "",
      visiblePassword: "",
      hiddenPassword: "",
      folderId: FOLDER_OPTIONS.NO_FOLDER,
      uri: "",
    },
    validation: {
      name: FormValidation.Required,
      visiblePassword: showPassword ? FormValidation.Required : undefined,
      hiddenPassword: showPassword ? undefined : FormValidation.Required,
      uri: (value) => {
        if (value && !value.match(/^https?:\/\//)) {
          return "Please enter a valid URI";
        }
      },
    },
  });

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => {
      const next = !prev;
      setTimeout(() => (next ? focus("visiblePassword") : focus("hiddenPassword")), 0);
      return next;
    });
  };

  useEffect(() => {
    focus("name");
  }, []);

  const generatePassword = async () => {
    if (isSubmitting) return;

    const toast = await showToast({ title: "Generating password...", style: Toast.Style.Animated });

    try {
      const options = await getPasswordGeneratorOptions();
      const generatedPassword = await bitwarden.generatePassword(options);
      setValue("visiblePassword", generatedPassword);
      setValue("hiddenPassword", generatedPassword);
      await Clipboard.copy(generatedPassword);
      toast.title = "Password generated and copied";
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.title = "Failed to generate password";
      toast.style = Toast.Style.Failure;
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Login" onSubmit={handleSubmit} icon={Icon.NewDocument} />
          <Action
            icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
            title={showPassword ? "Hide Password" : "Show Password"}
            onAction={togglePasswordVisibility}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            icon={Icon.Key}
            title="Generate Password"
            onAction={generatePassword}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          <DebuggingBugReportingActionSection />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="GitHub, Gmail" storeValue={false} />
      <Form.Dropdown {...itemProps.folderId} title="Folder" placeholder="Select folder" storeValue={false}>
        {folders.map((folder) => (
          <Form.Dropdown.Item
            key={folder.id}
            value={folder.id ?? FOLDER_OPTIONS.NO_FOLDER}
            title={folder.name}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField {...itemProps.username} title="Username" placeholder="john.doe@example.com" storeValue={false} />
      <Form.TextField {...itemProps.uri} title="Website URI" placeholder="https://example.com" storeValue={false} />
      {showPassword ? (
        <Form.TextField
          {...itemProps.visiblePassword}
          title="Password"
          placeholder="Enter password"
          storeValue={false}
          onChange={(value) => {
            itemProps.visiblePassword.onChange?.(value);
            itemProps.hiddenPassword.onChange?.(value);
          }}
        />
      ) : (
        <Form.PasswordField
          {...itemProps.hiddenPassword}
          onChange={(value) => {
            itemProps.hiddenPassword.onChange?.(value);
            itemProps.visiblePassword.onChange?.(value);
          }}
          title="Password"
          placeholder="Enter password"
          storeValue={false}
        />
      )}
      <Form.Description
        title=""
        text={`Press ⌘E to ${showPassword ? "hide" : "show"} password\nPress ⌘G to generate password`}
      />
    </Form>
  );
}

export default CreateLoginCommand;
