import { API_URL, headers, parseResponse } from "./api";
import { showToast, Toast, updateCommandMetadata } from "@raycast/api";

export default async function CheckAccountBalance() {
    const toast = await showToast(Toast.Style.Animated, "Checking");
    try {
        const response = await fetch(API_URL + "accountinfo/balance", {
            headers
        });
        const result: { balance?: number } = await parseResponse(response);
        const strBalance = `$${result.balance ?? 0}`;
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