import sharp from "@gutenye/sharp";
import { uniq } from "lodash";

export function getInputExts(): string[] {
  return uniq(
    Object.values(sharp.format)
      .filter((format) => format.input.file && format.input.fileSuffix)
      .flatMap((format) => format.input.fileSuffix)
      .map((ext) => ext.slice(1)),
  );
}
