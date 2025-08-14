import { type Tool, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import type { CreatePlaygroundMediaType } from "@/api/dash/requests";
import { createPlayground } from "@/api/dash/requests";

const snippets: Record<CreatePlaygroundMediaType, string> = {
  ts: 'Deno.serve((req: Request) => new Response("Hello World"));\n',
  js: 'Deno.serve((req) => new Response("Hello World"));\n',
  tsx: 'Deno.serve((req: Request) => new Response("Hello World"));\n',
  jsx: 'Deno.serve((req) => new Response("Hello World"));\n',
};

type Input = {
  /**
   * The ID of the organization.
   *
   * @remarks
   * Use the `get-organizations` tool to get a list of organizations. If no organization is provided, use the organization that has the name `Personal`
   */
  organizationId: string;
  /**
   * A code snippet to create a playground. The snippet should be a valid TypeScript, JavaScript, TSX, or JSX code.
   *
   * @remarks
   * If no snippet is provided, a default example will be used (Typescript).
   */
  snippet?: string;
  /**
   * The media type of the code snippet. The media type can be one of the following: `ts`, `js`, `tsx`, or `jsx`.
   *
   * @remarks
   * If no media type is provided, the default media type will be `ts` (Typescript).
   */
  mediaType?: CreatePlaygroundMediaType;
};

const tool = async (input: Input) => {
  const mediaType = input.mediaType ?? "ts";
  const snippet = input.snippet ?? snippets[mediaType];
  const project = await createPlayground(input.organizationId, snippet, mediaType);
  try {
    await open(`https://dash.deno.com/playground/${project.name}`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown error");
    showFailureToast("Failed to open the playground", err);
  }
};

export default tool;

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return { message: `Create a ${input.mediaType ?? "TypeScript"} playground? This will open a new browser tab.` };
};
