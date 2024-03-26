import { getKnownUniformTypes as getKnownUniformTypes_swift } from "swift:../../../swift/DefaultAppUtils";
import { UniformType } from "../../types/uniform-type";

export async function getKnownUniformTypes(options?: Partial<{ saveIconsTo: string }>): Promise<Array<UniformType>> {
  return await getKnownUniformTypes_swift(options ?? {});
}
