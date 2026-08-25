import { createHash } from "node:crypto";

import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveIssue } from "./linearUtils";

type Input = {
  issue: string;
  base64Content: string;
  filename: string;
  contentType: string;
  size?: number;
  sha256: string;
  title?: string;
  subtitle?: string;
};
export default withAccessToken(linear)(async (input: Input) => {
  const bytes = Buffer.from(input.base64Content, "base64");
  if (input.size !== undefined && bytes.byteLength !== input.size)
    throw new Error(`Decoded size ${bytes.byteLength} does not match ${input.size}.`);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest.toLowerCase() !== input.sha256.toLowerCase())
    throw new Error("Decoded file SHA-256 does not match sha256.");
  const issue = await resolveIssue(input.issue);
  const upload = await client().fileUpload(input.contentType, input.filename, bytes.byteLength);
  if (!upload.success || !upload.uploadFile) throw new Error("Failed to prepare attachment upload.");
  const headers = Object.fromEntries(upload.uploadFile.headers.map((header) => [header.key, header.value]));
  const response = await fetch(upload.uploadFile.uploadUrl, { method: "PUT", headers, body: bytes });
  if (!response.ok) throw new Error(`Attachment upload failed with HTTP ${response.status}.`);
  const result = await client().createAttachment({
    issueId: issue.id,
    url: upload.uploadFile.assetUrl,
    title: input.title ?? input.filename,
    subtitle: input.subtitle,
  });
  if (!result.success || !result.attachment) throw new Error("Failed to create attachment.");
  return result.attachment;
});
