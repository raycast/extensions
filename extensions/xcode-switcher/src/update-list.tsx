import { showToast, Toast, closeMainWindow } from "@raycast/api";
import { findXcodesPath, updateList } from "./utils/xcodes";
import { t } from "./utils/i18n";

export default async function Command() {
  const xcodesPath = findXcodesPath();

  if (!xcodesPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: t("xcodes.notFound"),
      message: t("xcodes.installMessage"),
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: t("update.updating"),
  });

  try {
    await updateList(xcodesPath);

    toast.style = Toast.Style.Success;
    toast.title = t("update.success");

    // Fecha a janela após sucesso
    await closeMainWindow();
  } catch (error: any) {
    toast.style = Toast.Style.Failure;
    toast.title = t("error");
    toast.message = error.message;
  }
}
