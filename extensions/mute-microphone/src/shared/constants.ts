import { environment } from "@raycast/api";
import { execSync } from "child_process";

const scriptPath = `${environment.assetsPath}/scripts/input-volume`;
execSync(`chmod +x ${scriptPath}`);

export { scriptPath };
