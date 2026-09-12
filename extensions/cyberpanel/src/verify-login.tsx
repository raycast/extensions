import { Toast, showToast } from "@raycast/api";
import { verifyLogin } from "./utils/api";
import { ADMIN_USER } from "./utils/constants";

export default async function VerifyConnection() {
  const response = await verifyLogin();

  if (!response.error_message) await showToast(Toast.Style.Success, "SUCCESS", `${ADMIN_USER} verified successfully`);
}
