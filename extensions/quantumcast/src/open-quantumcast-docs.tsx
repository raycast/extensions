import { docBaseUrl } from "./assets/globals";
import { open } from "@raycast/api";

export default async function Command() {
	open(encodeURI(docBaseUrl))
}
