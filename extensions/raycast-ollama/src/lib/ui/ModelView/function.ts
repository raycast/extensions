import * as Types from "./types";
import { DeleteOllamaServers, GetOllamaServers } from "../../settings/settings";
import { Ollama } from "../../ollama/ollama";
import { showToast, Toast } from "@raycast/api";
import { GetServerClass } from "../function";

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
  setSelectedServer: (value: string) => Promise<void>
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
 * Get Ollama Available Models.
 * @param server - Ollama Server Name.
 * @returns Array of Available Models.
 */
export async function GetModels(server: string | undefined): Promise<Types.UiModel[]> {
  let o: Types.UiModel[] = [];

  if (server === undefined) return o;

  let s = await GetServerClass();
  if (server !== "All" && !s.has(server)) return [];
  if (server !== "All") s = new Map([[server, s.get(server) as Ollama]]);
  (
    await Promise.all(
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
            const show = await s[1].OllamaApiShow(v.name);
            return {
              server: {
                name: s[0],
                ollama: s[1],
              },
              detail: v,
              show: show,
              modelfile: s[1].OllamaApiShowParseModelfile(show),
              ps: ps && ps.models.filter((ps) => ps.name === v.name)[0],
            };
          })
        );
      })
    )
  ).forEach((v) => (o = o.concat(v)));
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
  revalidate: CallableFunction
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
  await model.server.ollama
    .OllamaApiDelete(model.detail.name)
    .then(async () => {
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
  revalidate: CallableFunction
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
