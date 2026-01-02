import { callCoreApi } from "./api";
import { showToast, Toast, updateCommandMetadata } from "@raycast/api";

export default async function CheckAccountBalance() {
  const toast = await showToast(Toast.Style.Animated, "Checking");
  try {
    const result = await callCoreApi<{ balance: number }>("accountinfo/balance");
    const strBalance = `$${result.balance}`;
    await updateCommandMetadata({ subtitle: `Name.com - Balance: ${strBalance}` });
    toast.style = Toast.Style.Success;
    toast.title = "Checked";
    toast.message = strBalance;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Something went wrong";
    toast.message = `${error}`;
  }
}
