import { getVersion, listModels } from "../lib/mw";

/**
 * Lists the transcription models downloaded in MacWhisper, which one is active, and the MacWhisper version.
 */
export default async function tool() {
  const [models, version] = await Promise.all([listModels(), getVersion()]);
  return {
    version,
    activeModel: models.find((model) => model.active)?.id ?? null,
    models,
  };
}
