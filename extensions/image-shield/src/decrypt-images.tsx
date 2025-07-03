import { usePromise } from "@raycast/utils";
import PasswordForm from "./components/PasswordForm";
import GridLoadingView from "./components/GridLoadingView";
import GridRestoredImages from "./components/GridRestoredImages";
import { useDecryptImages } from "./hooks/useDecryptImages";
import DecryptImagesForm from "./components/DecryptImagesForm";

export default function Command() {
  const { isLoading, isInstantCall, data, selectedFiles, initialize, handleDecrypt } = useDecryptImages();

  // Initialize (if command is called with selected items from Finder)
  const { isLoading: isInitializing } = usePromise(async () => await initialize(), []);

  // Loading or initializing
  if (isLoading || isInitializing) {
    return <GridLoadingView />;
  }

  // No GUI for restored images - show loading while processing
  if (isInstantCall && data) {
    return <GridLoadingView title="Decrypting images..." />;
  }

  // Password form
  if (selectedFiles.manifest?.secure && !data) {
    return (
      <PasswordForm
        actionTitle="Decrypt"
        onSubmit={(secretKey) =>
          handleDecrypt(selectedFiles.manifest, selectedFiles.imagePaths, selectedFiles.workdir, secretKey)
        }
      />
    );
  }

  // Restored images grid
  if (data) {
    return <GridRestoredImages manifest={data.manifest} imageBuffers={data.imageBuffers} workdir={data.workdir} />;
  }

  // Default form view
  return <DecryptImagesForm />;
}
