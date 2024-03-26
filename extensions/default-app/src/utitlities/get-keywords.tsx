import { UniformType } from "../types/uniform-type";

export function getKeywords(uniformType: UniformType): string[] {
  const keywords: string[] = [];

  keywords.push(uniformType.id);

  keywords.push(...uniformType.id.split("."));

  if (uniformType.description) {
    keywords.push(uniformType.description);
  }

  if (uniformType.preferredFilenameExtension) {
    keywords.push(`.${uniformType.preferredFilenameExtension}`);
  }

  if (uniformType.preferredMimeType) {
    keywords.push(uniformType.preferredMimeType);
  }

  keywords.push(uniformType.application.name);

  if (uniformType.application.bundleId) {
    keywords.push(uniformType.application.bundleId);
  }

  return keywords;
}
