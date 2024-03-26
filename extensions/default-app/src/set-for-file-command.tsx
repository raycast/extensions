import { PopToRootType, showHUD } from "@raycast/api";
import { DefaultAppByFileForm } from "./components/default-app-by-file-form/default-app-by-file-form";
import { Toasts } from "./constants/toasts";
import { setDefaultApplication } from "./utitlities/swift/set-default-application";

export default function SetForFileCommand() {
  return (
    <DefaultAppByFileForm
      mode="file"
      onSubmit={async ({ applicationPath, filePath }) => {
        await setDefaultApplication({ for: "file", applicationPath, filePath });
        showHUD(Toasts.ChangeDefaultApp.Success.title, { clearRootSearch: true, popToRootType: PopToRootType.Default });
      }}
    />
  );
}
