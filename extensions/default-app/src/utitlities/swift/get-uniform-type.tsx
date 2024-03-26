import { getUniformType as getUniformType_swift } from "swift:../../../swift/DefaultAppUtils";
import { UniformType } from "../../types/uniform-type";

export async function getUniformType(filePath: string): Promise<UniformType> {
  return await getUniformType_swift(filePath);
}
