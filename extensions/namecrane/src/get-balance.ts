import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { namecrane } from "./namecrane";

export default async function GetBalance() {
    const toast = await showToast(Toast.Style.Animated, "Getting Balance");
    try {
        const result = await namecrane.getBalance();
        toast.style = Toast.Style.Success;
        toast.title = "Current Balance";
        toast.message = String(result.credit_balance);
        await updateCommandMetadata({subtitle: `NameCrane - Current Balance: ${result.credit_balance}`});
    } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`
    }
}