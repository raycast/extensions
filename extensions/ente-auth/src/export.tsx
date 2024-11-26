import { showError } from "./components/showError";
import { showToast, Toast, Detail } from "@raycast/api";
import { getSecrets, parseSecrets } from "./helpers/secrets";
import { DEFAULT_EXPORT_PATH, EXPORTPATH } from "./constants/ente";
import { checkEnteBinary, createEntePath, exportEnteAuthSecrets } from "./helpers/ente";

export default function Command() {
  const enteBinaryExists = checkEnteBinary();

  if (!enteBinaryExists) {
    return showError();
  }

  try {
    createEntePath(DEFAULT_EXPORT_PATH);
  } catch (error) {
    showToast(Toast.Style.Failure, "Folder creation failed");
    return <Detail markdown={`## Failed to create folder at \`${EXPORTPATH}\``} />;
  }

  try {
    exportEnteAuthSecrets();
  } catch (error) {
    showToast(Toast.Style.Failure, "Export failed");
  }

  const secrets = parseSecrets(getSecrets(EXPORTPATH));
  const secretsList = secrets
    .map((secret) => `- ${secret.issuer.replaceAll("+", " ")}  - \`${secret.username}\`\n`)
    .join("");

  return (
    <Detail
      isLoading={!secrets || secrets.length === 0}
      markdown={
        `### ${secrets.length} secrets exported from \`${EXPORTPATH}\`\n` + `\n**Secrets:**\n` + `${secretsList}`
      }
    />
  );
}
