import { requireAllowed } from "../lib/allowed";
import { endpointOf, listFiles, readFile } from "../lib/api";
import { loadState } from "../lib/store";
import { readValConfig } from "../lib/valconfig";

type Input = {
  /** The val as `handle/valName`, or a tool name from list-tools. */
  val: string;
  /** One file to read in full. Omit for the file listing and README. */
  path?: string;
};

export default async function getValInfo(input: Input) {
  const identifier = await resolveIdentifier(input.val);
  await requireAllowed(identifier);

  if (input.path) {
    const file = await readFile(identifier, input.path);
    return { val: identifier, path: input.path, fileType: file.fileType, content: file.content.slice(0, 40000) };
  }

  const [{ files }, config] = await Promise.all([listFiles(identifier), readValConfig(identifier)]);

  return {
    val: identifier,
    description: config?.description ?? null,
    // The one place the model learns a val's arguments, so it is read for the val it is about to run.
    inputSchema: config?.inputSchema ?? null,
    entrypoint: config?.entrypoint ?? null,
    files: files.map((file) => ({
      path: file.path,
      type: file.type,
      updatedAt: file.updatedAt,
      endpoint: endpointOf(file) ?? null,
    })),
    note: config
      ? undefined
      : `${identifier} has no Raycast config, so its arguments are unknown. Read its source to work them out.`,
  };
}

async function resolveIdentifier(value: string): Promise<string> {
  const state = await loadState();
  if (value.includes("/")) return value;

  const match = Object.keys(state.tools).find((identifier) => identifier.endsWith(`/${value}`));
  if (match) return match;

  throw new Error(`"${value}" is not a val identifier. Use handle/valName, as list-tools returns it.`);
}
