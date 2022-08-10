import { showToast, Toast } from "@raycast/api";

export default (message: string) => showToast({
	title: 'Error',
	message,
	style: Toast.Style.Failure
});