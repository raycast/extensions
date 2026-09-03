import * as Types from "./types";
import { DeleteOllamaServers, GetOllamaServers } from "../../settings/settings";
import { OllamaManager } from "../../ollama/ollama";
import { OllamaModelInfo } from "../../ollama/types";
import { showToast, Toast } from "@raycast/api";
export function ClearModelShowCache(): void {
  // Model details are intentionally loaded from the compact list response.
  // Keeping full modelfiles/templates for every model can exceed Raycast's heap limit.
}

/**
 * Get Ollama Server Class.
 * @returns Server Map.
 */
export async function GetServerClassByName(name: string): Promise<OllamaManager> {
  const s = await GetOllamaServers();
  if (!s.has(name)) throw new Error("Ollama Server Not Configured");
  return new OllamaManager(s.get(name));
}

/** Fetch full metadata only for the model currently being inspected. */
export async function GetModelDetails(model: Types.UiModel | undefined): Promise<OllamaModelInfo | undefined> {
  if (!model?.server.ollama) return undefined;
  return model.server.ollama.show(model.detail.name);
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

/**
 * Get models managed by Ollama's lifecycle API. Provider inference configuration
 * intentionally lives elsewhere; cloud/custom models cannot be pulled or unloaded.
 * @param server - Ollama lifecycle server name.
 * @returns Array of Available Models.
 */
export async function GetModels(server: string | undefined): Promise<Types.UiModel[]> {
  let o: Types.UiModel[] = [];

  if (server === undefined) return o;

  {
    let s = new Map<string, OllamaManager>();
    const configured = await GetOllamaServers();
    configured.forEach((value, key) => s.set(key, new OllamaManager(value)));
    if (server !== "All" && s.has(server)) {
      s = new Map([[server, s.get(server) as OllamaManager]]);
    } else if (server !== "All") {
      s = new Map();
    }
    const ollamaModels = await Promise.all(
      [...s.entries()].map(async (s): Promise<Types.UiModel[]> => {
        const tag = await s[1].list().catch(async (e: Error) => {
          await showToast({ style: Toast.Style.Failure, title: `'${s[0]}' Server`, message: e.message });
          return undefined;
        });
        const ps = await s[1].running().catch(async (e: Error) => {
          await showToast({ style: Toast.Style.Failure, title: `'${s[0]}' Server`, message: e.message });
          return undefined;
        });
        if (!tag) return await Promise.resolve([] as Types.UiModel[]);
        return tag.map((v): Types.UiModel => ({
          server: { name: s[0], ollama: s[1], isCustom: false },
          detail: v,
          show: {},
          ps: ps?.find((ps) => ps.name === v.name),
        }));
      }),
    );
    ollamaModels.forEach((v) => (o = o.concat(v)));
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
    .delete(model.detail.name)
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
  ollama: OllamaManager,
  server: string,
  model: string,
  setDownload: React.Dispatch<React.SetStateAction<Types.UiModelDownload[]>>,
  revalidate: CallableFunction,
): Promise<void> {
  try {
    await ollama.pull(model, (progress) => {
      if (progress.status) void showToast({ style: Toast.Style.Animated, title: progress.status });
      if (progress.total && progress.completed !== undefined) {
        const data = (progress.completed / progress.total) * 100;
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
      }
    });
    ClearModelShowCache();
    setDownload((prev) => prev.filter((v) => v.server !== server || v.name !== model));
    revalidate();
    await showToast({ style: Toast.Style.Success, title: `Model '${model}' Downloaded on '${server}' Server.` });
  } catch (error) {
    setDownload((prev) => prev.filter((v) => v.server !== server || v.name !== model));
    await showToast({ style: Toast.Style.Failure, title: error instanceof Error ? error.message : String(error) });
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
    .setLoaded(model.detail.name, -1)
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
    .setLoaded(model.detail.name, 0)
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
