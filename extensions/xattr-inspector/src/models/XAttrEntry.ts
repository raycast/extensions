export interface XAttr {
  name: string;
  value: string;
  rawValue: string;
  filePath: string;
  sizeBytes: number;
  isBinaryPlist?: boolean;
  binaryPlistXml?: string;
  editValue?: string;
  kind?: AttributeKind;
}

export type AttributeKind = "binaryPlist" | "xmlPlist" | "plistDate" | "text";

export interface FileWithXattrs {
  path: string;
  displayName: string;
  attributes: XAttr[];
}
