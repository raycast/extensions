import { Action, ActionPanel, Clipboard, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DebuggingBugReportingActionSection } from "~/components/actions";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import VaultListenersProvider from "~/components/searchVault/context/vaultListeners";
import { FOLDER_OPTIONS } from "~/constants/general";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { getPasswordGeneratorOptions } from "./utils/passwords";

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

type FormState = {
  name: string;
  username: string;
  password: string;
  folderId: string | null;
};

type TouchedFields = {
  name: boolean;
  username: boolean;
  password: boolean;
};

function CreateLoginComponent() {
  const bitwarden = useBitwarden();
  const { folders } = useVaultContext();
  const { formState, updateField, markFieldAsTouched, resetForm, getFieldError, isLoading, handleSubmit } =
    useCreateLoginForm();

  const [showPassword, setShowPassword] = useState(false);
  const passwordFieldRef = useRef<Form.TextField>(null);
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
    setTimeout(() => passwordFieldRef.current?.focus(), 0);
  };

  const PasswordField = showPassword ? Form.TextField : Form.PasswordField;

  const nameFieldRef = useRef<Form.TextField>(null);

  useEffect(() => {
    nameFieldRef.current?.focus();
  }, []);

  const onSubmit = async () => {
    const toast = await showToast({ title: "Creating Login...", style: Toast.Style.Animated });
    try {
      const { name, username, password, folderId } = formState;
      const { error } = await bitwarden.createLoginItem(name, username, password, folderId);
      if (error) throw error;

      toast.style = Toast.Style.Success;
      toast.title = "Login created";
      toast.message = name;
      resetForm();
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create login";
      toast.message = undefined;
    }
  };

  const generatePassword = async () => {
    if (isLoading) return;

    const toast = await showToast({ title: "Generating password...", style: Toast.Style.Animated });

    try {
      const options = await getPasswordGeneratorOptions();
      const generatedPassword = await bitwarden.generatePassword(options);
      updateField("password")(generatedPassword);
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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Login" onSubmit={handleSubmit(onSubmit)} icon={Icon.AddPerson} />
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
      <Form.TextField
        id="name"
        title="Name"
        placeholder="eg: GitHub, Gmail"
        value={formState.name}
        onChange={updateField("name")}
        onBlur={markFieldAsTouched("name")}
        storeValue={false}
        ref={nameFieldRef}
        error={getFieldError("name")}
      />
      <Form.Dropdown
        id="folder"
        title="Folder"
        placeholder="Select folder (optional)"
        value={formState.folderId ?? FOLDER_OPTIONS.NO_FOLDER}
        onChange={(value) => updateField("folderId")(value === FOLDER_OPTIONS.NO_FOLDER ? null : value)}
        storeValue={false}
      >
        {folders.map((folder) => (
          <Form.Dropdown.Item
            key={folder.id}
            value={folder.id ?? FOLDER_OPTIONS.NO_FOLDER}
            title={folder.name}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="username"
        title="Username"
        placeholder="eg: john.doe@example.com"
        value={formState.username}
        onChange={updateField("username")}
        onBlur={markFieldAsTouched("username")}
        storeValue={false}
        error={getFieldError("username")}
      />
      <PasswordField
        id={showPassword ? "createLoginPlainPassword" : "createLoginPassword"}
        title="Password"
        placeholder="Enter password"
        value={formState.password}
        onChange={updateField("password")}
        onBlur={markFieldAsTouched("password")}
        ref={passwordFieldRef}
        storeValue={false}
        error={getFieldError("password")}
      />
      <Form.Description
        title=""
        text={`Press ⌘E to ${showPassword ? "hide" : "show"} password\nPress ⌘G to generate password`}
      />
    </Form>
  );
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  username: "",
  password: "",
  folderId: null,
};

const INITIAL_TOUCHED_STATE: TouchedFields = {
  name: false,
  username: false,
  password: false,
};

const useCreateLoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [touchedFields, setTouchedFields] = useState<TouchedFields>(INITIAL_TOUCHED_STATE);

  const updateField = useCallback(
    (field: keyof FormState) => (value: string | null) => setFormState((prev) => ({ ...prev, [field]: value })),
    []
  );

  const markFieldAsTouched = useCallback(
    (field: keyof TouchedFields) => () => setTouchedFields((prev) => ({ ...prev, [field]: true })),
    []
  );

  const resetForm = () => {
    setFormState(INITIAL_FORM_STATE);
    setTouchedFields(INITIAL_TOUCHED_STATE);
  };

  const isFormValid = useMemo(() => {
    const { name, username, password } = formState;
    return name.length > 0 && username.length > 0 && password.length > 0;
  }, [formState]);

  const getFieldError = useCallback(
    (field: keyof Omit<FormState, "folderId">) => {
      const value = formState[field];
      const isEmpty = !value || value.length === 0;
      const isFieldTouched = touchedFields[field];
      const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
      return isFieldTouched && isEmpty ? `${capitalizedField} is required` : undefined;
    },
    [formState, touchedFields]
  );

  const handleSubmit = useCallback((cb: () => Promise<void>) => {
    return () => {
      setIsLoading(true);
      return cb().finally(() => setIsLoading(false));
    };
  }, []);

  return {
    formState,
    updateField,
    markFieldAsTouched,
    resetForm,
    isFormValid,
    getFieldError,
    isLoading,
    handleSubmit,
  };
};

export default CreateLoginCommand;
