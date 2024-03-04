import { Application } from "@raycast/api";
import { getDefaultApplications as getDefaultApplications_swift } from "swift:../../../swift/DefaultAppUtils";
import { Openable } from "../../types/openable";
import { getUniformType } from "./get-uniform-type";

export async function getCompatibleApplications(openable: Openable): Promise<Array<Application>> {
  if (openable.type === "file") {
    const uniformType = await getUniformType(openable.filePath);
    return await getDefaultApplications_swift(uniformType.id);
  } else {
    return await getDefaultApplications_swift(openable.uniformTypeId);
  }
}
