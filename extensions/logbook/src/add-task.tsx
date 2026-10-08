import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { createTask } from "./api";
import { logbook } from "./oauth";

/** No-view: type into Raycast's root search, hit Enter, nothing opens. */
async function AddTask(props: LaunchProps<{ arguments: Arguments.AddTask }>) {
	const text = props.arguments.text.trim();

	if (!text) {
		await showHUD("Nothing to add");
		return;
	}

	try {
		await createTask(text);
		await showHUD(`Added "${text}"`);
	} catch (error) {
		await showFailureToast(error, { title: "Could not add task" });
	}
}

export default withAccessToken(logbook)(AddTask);
