import { usePromise } from "@raycast/utils";
import EncryptImagesFrom from "./components/EncryptImagesFrom";
import { useEncryptImages } from "./hooks/useEncryptImages";
import GridLoadingView from "./components/GridLoadingView";
import { SettingsFormValues } from "./components/SettingsForm";
import PasswordForm from "./components/PasswordForm";
import { useSettings } from "./hooks/useSettings";

export default function Command() {
  const { settings, isLoading } = useSettings();
  // Loading
  if (isLoading || !settings) {
    return <GridLoadingView />;
  }

  return <EncryptImages settings={settings} />;
}

function EncryptImages({ settings }: { settings: SettingsFormValues }) {
  const { isLoading, isInstantCall, data, selectedFiles, initialize, handleEncrypt } = useEncryptImages(settings);

  // Initialize (if command is called with selected items from Finder)
  const { isLoading: isInitializing } = usePromise(async () => await initialize(), []);

  // Loading or initializing
  if (isLoading || isInitializing) {
    return <GridLoadingView />;
  }

  // No GUI for encrypted images - show loading while processing
  if (isInstantCall && data) {
    return <GridLoadingView title="Encrypting images..." />;
  }

  // Password form
  if (selectedFiles.config?.encrypted && !data) {
    return (
      <PasswordForm
        actionTitle="Encrypt"
        onSubmit={(secretKey) => handleEncrypt(selectedFiles.imagePaths, selectedFiles.workdir, secretKey)}
      />
    );
  }

  // Default form view
  return <EncryptImagesFrom settings={settings} />;
}
