import * as Types from "./types";
import { DeleteOllamaServers, GetOllamaServers } from "../../settings/settings";
import { Ollama } from "../../ollama/ollama";
import { showToast, Toast } from "@raycast/api";
import { GetServerClass } from "../function";
import { OllamaApiShowModelfile, OllamaApiShowResponse } from "../../ollama/types";

const showCache = new Map<string, { show: OllamaApiShowResponse; modelfile?: OllamaApiShowModelfile }>();

export function ClearModelShowCache(): void {
  showCache.clear();
}

/**
 * Get Ollama Server Class.
 * @returns Server Map.
 */
export async function GetServerClassByName(name: string): Promise<Ollama> {
  const s = await GetOllamaServers();
  if (!s.has(name)) throw new Error("Ollama Server Not Configured");
  return new Ollama(s.get(name));
}

/**
 * Delete Ollama Server.
 * @param name - Ollama Server Name.
 */
export async function DeleteServer(
  name: string,
  revalidate: CallableFunction,
  setSelectedServer: (value: string) => Promise<void>,
): Promise<void> {
  await DeleteOllamaServers(name)
    .then(async () => {
      setSelectedServer("Local");
      revalidate();
      await showToast({ style: Toast.Style.Success, title: `Ollama Server '${name}' Deleted` });
    })
    .catch(async (e) => {
      await showToast({ style: Toast.Style.Failure, title: `Error Deleting Ollama Server '${name}'`, message: e });
    });
}

import { formatCustomServerName, isCustomServer } from "../../providers/unified-provider";
import { loadCustomProviders } from "../../providers/storage";
import { ModelCapability } from "../../enum";

async function getCustomUiModels(serverFilter: string): Promise<Types.UiModel[]> {
  const providers = await loadCustomProviders();
  const result: Types.UiModel[] = [];

  for (const provider of providers) {
    const formattedName = formatCustomServerName(provider);
    if (
      serverFilter !== "All" &&
      serverFilter !== formattedName &&
      serverFilter !== provider.name &&
      serverFilter !== provider.id
    ) {
      continue;
    }

    for (const model of provider.models) {
      const caps: ModelCapability[] = [ModelCapability.Completion];
      if (model.abilities?.vision?.supported) caps.push(ModelCapability.Vision);
      if (model.abilities?.tools?.supported) caps.push(ModelCapability.Tools);
      if (model.abilities?.reasoning_effort?.supported) caps.push(ModelCapability.Thinking);

      result.push({
        server: {
          name: formattedName,
          isCustom: true,
        },
        detail: {
          name: model.id,
          modified_at: "",
          size: model.context || 0,
          digest: "",
          details: {
            parent_model: "",
            format: "custom",
            family: provider.name,
            families: [provider.name],
            parameter_size: "",
            quantization_level: "",
          },
        },
        show: {
          license: "",
          modelfile: "",
          parameters: "",
          template: "",
          system: model.description || "",
          details: {
            parent_model: "",
            format: "custom",
            family: provider.name,
            families: [provider.name],
            parameter_size: "",
            quantization_level: "",
          },
          capabilities: caps,
        },
      });
    }
  }

  return result;
}

/**
 * Get Ollama and Custom Provider Available Models.
 * @param server - Ollama Server Name or Custom Provider Name.
 * @returns Array of Available Models.
 */
export async function GetModels(server: string | undefined): Promise<Types.UiModel[]> {
  let o: Types.UiModel[] = [];

  if (server === undefined) return o;

  // 1. Fetch Ollama models if server is "All" or a configured Ollama server
  if (server === "All" || !isCustomServer(server)) {
    let s = await GetServerClass();
    if (server !== "All" && s.has(server)) {
      s = new Map([[server, s.get(server) as Ollama]]);
    } else if (server !== "All") {
      s = new Map();
    }
    const ollamaModels = await Promise.all(
      [...s.entries()].map(async (s): Promise<Types.UiModel[]> => {
        const tag = await s[1].OllamaApiTags().catch(async (e: Error) => {
          await showToast({ style: Toast.Style.Failure, title: `'${s[0]}' Server`, message: e.message });
          return undefined;
        });
        const ps = await s[1].OllamaApiPs().catch(async (e: Error) => {
          await showToast({ style: Toast.Style.Failure, title: `'${s[0]}' Server`, message: e.message });
          return undefined;
        });
        if (!tag) return await Promise.resolve([] as Types.UiModel[]);
        return await Promise.all(
          tag.models.map(async (v): Promise<Types.UiModel> => {
            const cacheKey = `${s[0]}::${v.name}::${v.digest || v.modified_at}`;
            let cached = showCache.get(cacheKey);
            if (!cached) {
              const show = await s[1].OllamaApiShow(v.name);
              cached = {
                show,
                modelfile: s[1].OllamaApiShowParseModelfile(show),
              };
              showCache.set(cacheKey, cached);
            }
            return {
              server: {
                name: s[0],
                ollama: s[1],
                isCustom: false,
              },
              detail: v,
              show: cached.show,
              modelfile: cached.modelfile,
              ps: ps && ps.models.filter((ps) => ps.name === v.name)[0],
            };
          }),
        );
      }),
    );
    ollamaModels.forEach((v) => (o = o.concat(v)));
  }

  // 2. Fetch Custom Provider models if server is "All" or a custom server
  if (server === "All" || isCustomServer(server)) {
    const customModels = await getCustomUiModels(server);
    o = o.concat(customModels);
  }

  return o;
}

/**
 * Update model pulling from the registry the latest version
 * @param model.
 * @param setDownload - setDownload Function.
 * @param revalidate - RevalidateModel Function.
 */
export async function UpdateModel(
  model: Types.UiModel,
  setDownload: React.Dispatch<React.SetStateAction<Types.UiModelDownload[]>>,
  revalidate: CallableFunction,
) {
  const o = await GetServerClassByName(model.server.name);
  await PullModel(o, model.server.name, model.detail.name, setDownload, revalidate);
}

/**
 * Delete Model.
 * @param model.
 * @param revalidate - revalidate function for reload all models.
 */
export async function DeleteModel(model: Types.UiModel, revalidate: CallableFunction): Promise<void> {
  if (!model.server.ollama) return;
  await model.server.ollama
    .OllamaApiDelete(model.detail.name)
    .then(async () => {
      ClearModelShowCache();
      await showToast({
        style: Toast.Style.Success,
        title: `Model '${model.detail.name}' Deleted on '${model.server.name}' Server`,
      });
      revalidate();
    })
    .catch(async (e) => await showToast({ style: Toast.Style.Failure, title: "Error", message: e }));
}

/**
 * Download Model.
 * @param ollama - Ollama Class.
 * @param server - Ollama Server Name.
 * @param model - Model Name.
 * @param setDownload - setDownload Function.
 * @param revalidate - RevalidateModel Function.
 */
export async function PullModel(
  ollama: Ollama,
  server: string,
  model: string,
  setDownload: React.Dispatch<React.SetStateAction<Types.UiModelDownload[]>>,
  revalidate: CallableFunction,
): Promise<void> {
  const e = await ollama.OllamaApiPull(model).catch(async (err): Promise<undefined> => {
    await showToast({ style: Toast.Style.Failure, title: err.message });
    return undefined;
  });

  if (e) {
    e.on("message", async (data) => {
      await showToast({ style: Toast.Style.Animated, title: data });
    });
    e.on("downloading", (data: number) => {
      const currentDownload = data.toFixed(2);
      setDownload((prev) => {
        const i = prev.findIndex((v) => v.server === server && v.name === model);
        if (i < 0) {
          prev.push({ server: server, name: model, download: Number(currentDownload) });
          return [...prev];
        }
        if (currentDownload !== prev[i].download.toFixed(2)) {
          prev[i].download = Number(currentDownload);
          return [...prev];
        }
        return prev;
      });
    });
    e.on("done", async () => {
      ClearModelShowCache();
      setDownload((prev) => {
        const n = prev.filter((v) => v.server !== server && v.name !== model);
        return [...n];
      });
      revalidate();
      await showToast({ style: Toast.Style.Success, title: `Model '${model}' Downloaded on '${server}' Server.` });
    });
    e.on("error", async (data) => {
      setDownload((prev) => {
        prev.filter((v) => v.server !== server && v.name !== model);
        return [...prev];
      });
      await showToast({ style: Toast.Style.Failure, title: data });
    });
  }
}

/**
 * Load Model on Memory.
 * @param model.
 * @param revalidate - revalidate function for reload all models.
 */
export async function LoadModel(model: Types.UiModel, revalidate: CallableFunction): Promise<void> {
  await showToast({
    style: Toast.Style.Animated,
    title: `Loading Model '${model.detail.name}' on '${model.server.name}' Memory`,
  });
  if (!model.server.ollama) throw new Error("Ollama client unavailable");
  await model.server.ollama
    .OllamaApiGenerateNoStream({
      model: model.detail.name,
      keep_alive: -1,
    })
    .then(async () => {
      await showToast({
        style: Toast.Style.Success,
        title: `Model '${model.detail.name}' on '${model.server.name}' Loaded on Memory`,
      });
      revalidate();
    })
    .catch(async (e) => await showToast({ style: Toast.Style.Failure, title: "Error", message: e }));
}

/**
 * unload Model from Memory.
 * @param model.
 * @param revalidate - revalidate function for reload all models.
 */
export async function UnloadModel(model: Types.UiModel, revalidate: CallableFunction): Promise<void> {
  await showToast({
    style: Toast.Style.Animated,
    title: `Unloading Model '${model.detail.name}' on '${model.server.name}' Memory`,
  });
  if (!model.server.ollama) throw new Error("Ollama client unavailable");
  await model.server.ollama
    .OllamaApiGenerateNoStream({
      model: model.detail.name,
      keep_alive: 0,
    })
    .then(async () => {
      /* '/api/ps' do not update immidiatly after unloading the model so a delay of 500ms is necessary */
      await new Promise<void>((res) => setTimeout(res, 500));
      await showToast({
        style: Toast.Style.Success,
        title: `Model '${model.detail.name}' on '${model.server.name}' Unloaded from Memory`,
      });
      revalidate();
    })
    .catch(async (e) => await showToast({ style: Toast.Style.Failure, title: "Error", message: e }));
}
