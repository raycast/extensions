import { Application } from "@raycast/api";
import { getApplication as getApplication_swift } from "swift:../../../swift/DefaultAppUtils";

export async function getApplication(applicationPath: string): Promise<Application> {
  return await getApplication_swift(applicationPath);
}
