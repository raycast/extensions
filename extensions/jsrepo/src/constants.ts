import { Toast } from "@raycast/api";

export const CREATE_ERROR_TOAST_OPTIONS = (error: unknown): Toast.Options => ({
	style: Toast.Style.Failure,
	title: "Error fetching data",
	message: String(error),
});
