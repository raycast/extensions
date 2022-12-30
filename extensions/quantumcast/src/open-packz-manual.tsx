import getLatestPackzInstalled from "./io/getLatestPackzInstalled";
import { applicationsFolder } from "./assets/preferences";
import { open } from "@raycast/api";

export default async function Command() {
	const packzManual = await getLatestPackzInstalled(applicationsFolder)
	open(encodeURI(packzManual))
}
