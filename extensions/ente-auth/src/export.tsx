import { Detail } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { showError } from "./components/showError";
import { DEFAULT_EXPORT_DIR_PATH, EXPORT_FILE_PATH } from "./constants/ente";
import { checkEnteBinary, createEntePath, exportEnteAuthSecrets } from "./helpers/ente";
import { getSecrets, parseSecrets } from "./helpers/secrets";

export default function Command() {
	const enteBinaryExists = checkEnteBinary();

	if (!enteBinaryExists) {
		return showError();
	}

	try {
		createEntePath(DEFAULT_EXPORT_DIR_PATH());
	} catch (error) {
		showFailureToast(error, { title: "Folder creation failed" });
		return <Detail markdown={`## Failed to create folder at \`${DEFAULT_EXPORT_DIR_PATH()}\``} />;
	}

	try {
		exportEnteAuthSecrets();
	} catch (error) {
		showFailureToast(error, { title: "Export failed" });
	}

	const secrets = parseSecrets(getSecrets(EXPORT_FILE_PATH));
	const secretsList = secrets
		.map((secret) => `- ${secret.issuer.replaceAll("+", " ")}  - \`${secret.username}\`\n`)
		.join("");

	return (
		<Detail
			isLoading={!secrets || secrets.length === 0}
			markdown={
				`### ${secrets.length} secrets exported from \`${EXPORT_FILE_PATH}\`\n` +
				`\n**Secrets:**\n` +
				`${secretsList}`
			}
		/>
	);
}
