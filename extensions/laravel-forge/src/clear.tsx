import {
    clearLocalStorage, showToast, ToastStyle
} from "@raycast/api";

export default async () => {

    await clearLocalStorage();
    showToast(ToastStyle.Success, "Success", "Laravel Forge Cache was cleared.");

}
