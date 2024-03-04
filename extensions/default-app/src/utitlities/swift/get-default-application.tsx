import { Application } from "@raycast/api";
import {
  getDefaultApplicationForFile as getDefaultApplicationForFile_swift,
  getDefaultApplicationForFileType as getDefaultApplicationForUti_swift,
} from "swift:../../../swift/DefaultAppUtils";
import { Openable } from "../../types/openable";

export async function getDefaultApplication(openable: Openable): Promise<Application> {
  if (openable.type === "file") {
    return await getDefaultApplicationForFile_swift(openable.filePath);
  } else {
    return await getDefaultApplicationForUti_swift(openable.uniformTypeId);
  }
}
