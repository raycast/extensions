export type ManifestType = "hls" | "dash" | "webvtt" | "unknown";

export interface ManifestLineItem {
  type: "header" | "tag" | "uri";
  line: string;
  lineNumber: number;
  uri?: string;
  resolvedUri?: string;
  isInteractive: boolean;
  displayName?: string;
  mediaType?: string;
}
