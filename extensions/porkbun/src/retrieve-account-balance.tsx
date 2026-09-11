import { Toast, showToast } from "@raycast/api";
import { Response } from "./utils/types";
import { getAccountBalance } from "./utils/api";

export default async function RetrieveAccountBalance() {
  const response = (await getAccountBalance()) as Response;
  if (response.status === "SUCCESS")
    await showToast({
      style: Toast.Style.Success,
      title: "SUCCESS!",
      message: `Your Balance: ${response.display ?? "N/A"}`,
    });
}
