import { API_HEADERS, API_URL, parseResponse } from "./api";
import { showToast, Toast, updateCommandMetadata } from "@raycast/api";

export default async function CheckAccountBalance() {
    const toast = await showToast(Toast.Style.Animated, "Checking");
    try {
        const response = await fetch(API_URL + "accountinfo/balance", {
            headers: API_HEADERS
        });
        const result: { balance?: number } = await parseResponse(response);
        const balance = `$${result.balance ?? 0}`;
        await updateCommandMetadata({ subtitle: `Name.com - Balance: ${balance}` });
        toast.style = Toast.Style.Success;
        toast.title = "Checked";
        toast.message = balance;
    } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Something went wrong";
        toast.message = `${error}`;
    }
}