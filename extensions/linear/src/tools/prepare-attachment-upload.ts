import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveIssue } from "./linearUtils";

type Input = { issue: string; filename: string; contentType: string; size: number; title?: string; subtitle?: string };
export default withAccessToken(linear)(async (input: Input) => {
  if (input.size >= 2_000_000_000) throw new Error("Files must be smaller than 2 GB.");
  await resolveIssue(input.issue);
  const result = await client().fileUpload(input.contentType, input.filename, input.size);
  if (!result.success || !result.uploadFile) throw new Error("Failed to prepare attachment upload.");
  return {
    issue: input.issue,
    assetUrl: result.uploadFile.assetUrl,
    uploadRequest: {
      url: result.uploadFile.uploadUrl,
      headers: Object.fromEntries(result.uploadFile.headers.map((header) => [header.key, header.value])),
    },
    title: input.title ?? input.filename,
    subtitle: input.subtitle,
  };
});
