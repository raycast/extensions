import { KovaPDF, type FileInput, type ToolId } from "@kovapdf/sdk";
import { EXTENSION_VERSION, type ClientLike } from "./logic";

/** The SDK client as Raycast: X-KovaPDF-Client: raycast, User-Agent kovapdf-raycast/<version>. */
export function makeClient(apiKey: string): ClientLike {
  const kova = new KovaPDF({ apiKey, client: { id: "raycast", name: "raycast", version: EXTENSION_VERSION } });
  return {
    run: (tool, inputs, options, runOptions) =>
      kova.run(tool as ToolId, inputs as FileInput[], options as never, runOptions),
    verify: async (file) => ({ ...(await kova.verify(file)) }),
  };
}
