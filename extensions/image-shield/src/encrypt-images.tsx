import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import EncryptImagesForm from "./components/EncryptImagesForm";
import { useEncryptImages } from "./hooks/useEncryptImages";
import GridLoadingView from "./components/GridLoadingView";
import PasswordForm from "./components/PasswordForm";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, isInstantCall, data, selectedFiles, initialize, handleEncrypt } = useEncryptImages(preferences);

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
  return <EncryptImagesForm />;
}
