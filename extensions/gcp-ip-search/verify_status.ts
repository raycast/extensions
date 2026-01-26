
import { checkGcloudStatus } from "./src/utils";

(async () => {
  console.log("Checking gcloud status...");
  const status = await checkGcloudStatus();
  console.log("Status Result:", JSON.stringify(status, null, 2));
})();
