import { PopToRootType, showHUD } from "@raycast/api";
import { DefaultAppByFileForm } from "./components/default-app-by-file-form/default-app-by-file-form";
import { Toasts } from "./constants/toasts";
import { setDefaultApplication } from "./utitlities/swift/set-default-application";

export default function SetForFileTypeCommand() {
  return (
    <DefaultAppByFileForm
      mode="file-type"
      onSubmit={async ({ applicationPath, uniformTypeId }) => {
        await setDefaultApplication({ for: "type", applicationPath, uniformTypeId: uniformTypeId });
        showHUD(Toasts.ChangeDefaultApp.Success.title, { clearRootSearch: true, popToRootType: PopToRootType.Default });
      }}
    />
  );
}
