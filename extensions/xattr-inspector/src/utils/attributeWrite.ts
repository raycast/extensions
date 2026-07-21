import { AttributeKind } from "../models/XAttrEntry";
import { runCommand } from "./command";
import {
  isMetadataAttribute,
  isPlistDateAttribute,
  isPlistStringArrayAttribute,
  isReadOnlyBinaryAttribute,
} from "./constants";
import {
  dateStringToBinaryPlist,
  normalizeHexInput,
  parseStringListInput,
  parseUserTagsInput,
  stringArrayToBinaryPlist,
  stringToBinaryPlist,
  writeAttributeFromBuffer,
  xmlStringToBinaryPlist,
} from "./xattrHelper";

export type PreparedAttributeWrite =
  | { mode: "buffer"; buffer: Buffer; sizeBytes: number }
  | { mode: "text"; value: string; sizeBytes: number };

function isXmlPlist(value: string): boolean {
  return value.trim().startsWith("<?xml");
}

export function assertAttributeWritable(key: string): void {
  if (isReadOnlyBinaryAttribute(key)) {
    throw new Error("This system/binary attribute is unsafe to edit from this form");
  }
}

export async function prepareAttributeWrite(
  key: string,
  value: string,
  kind: AttributeKind,
  inferTypedMetadata: boolean,
): Promise<PreparedAttributeWrite> {
  switch (kind) {
    case "binary": {
      const buffer = normalizeHexInput(value);
      return { mode: "buffer", buffer, sizeBytes: buffer.length };
    }
    case "binaryPlist": {
      if (!isXmlPlist(value)) {
        throw new Error("Binary plist edits must be valid XML plist text");
      }
      const buffer = await xmlStringToBinaryPlist(value);
      return { mode: "buffer", buffer, sizeBytes: buffer.length };
    }
    case "xmlPlist": {
      if (!isXmlPlist(value)) {
        throw new Error("XML plist must start with <?xml");
      }
      await xmlStringToBinaryPlist(value);
      return { mode: "text", value, sizeBytes: Buffer.byteLength(value, "utf8") };
    }
    case "plistDate": {
      const buffer = await dateStringToBinaryPlist(value);
      return { mode: "buffer", buffer, sizeBytes: buffer.length };
    }
    default:
      break;
  }

  if (inferTypedMetadata && isXmlPlist(value)) {
    const buffer = await xmlStringToBinaryPlist(value);
    return { mode: "buffer", buffer, sizeBytes: buffer.length };
  }

  if (inferTypedMetadata && isPlistDateAttribute(key)) {
    const buffer = await dateStringToBinaryPlist(value);
    return { mode: "buffer", buffer, sizeBytes: buffer.length };
  }

  if (inferTypedMetadata && isPlistStringArrayAttribute(key)) {
    const values =
      key === "com.apple.metadata:_kMDItemUserTags" ? parseUserTagsInput(value) : parseStringListInput(value);
    const buffer = await stringArrayToBinaryPlist(values);
    return { mode: "buffer", buffer, sizeBytes: buffer.length };
  }

  if (inferTypedMetadata && isMetadataAttribute(key)) {
    const buffer = await stringToBinaryPlist(value);
    return { mode: "buffer", buffer, sizeBytes: buffer.length };
  }

  return { mode: "text", value, sizeBytes: Buffer.byteLength(value, "utf8") };
}

export async function writePreparedAttribute(filePath: string, key: string, prepared: PreparedAttributeWrite) {
  if (prepared.mode === "buffer") {
    await writeAttributeFromBuffer(filePath, key, prepared.buffer);
    return;
  }

  await runCommand("xattr", ["-w", key, prepared.value, filePath]);
}
