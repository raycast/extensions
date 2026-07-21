export interface XAttr {
  name: string;
  value: string;
  rawValue: string;
  rawHex?: string;
  filePath: string;
  sizeBytes: number;
  maclRecords?: MACLRecord[];
  isBinaryPlist?: boolean;
  binaryPlistXml?: string;
  plistJson?: string;
  plistSummary?: PlistSummary;
  editValue?: string;
  kind?: AttributeKind;
}

export type AttributeKind = "binaryPlist" | "xmlPlist" | "plistDate" | "binary" | "text";

export interface MACLRecord {
  header: string;
  appUUID: string;
}

export interface PlistSummary {
  rootType: string;
  archiveType?: string;
  topLevelKeys?: string[];
}

export interface FileWithXattrs {
  path: string;
  displayName: string;
  attributes: XAttr[];
}
