import { showToast, Toast } from "@raycast/api";
import { ATCError } from "../Hooks/useAppStoreConnect";

export function presentError(error: any) {
    if (error instanceof ATCError) {
        showToast({
            style: Toast.Style.Failure,
            title: error.title,
            message: error.detail
        });
    } else {
        showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Something went wrong"
        });
    }
}