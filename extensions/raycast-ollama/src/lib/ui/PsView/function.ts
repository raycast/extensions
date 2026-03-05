import { showToast, Toast } from "@raycast/api";
import { Ollama } from "../../ollama/ollama";
import { GetServerClass } from "../function";
import * as Types from "./types";

/**
 * Get Ollama Loaded Models.
 * @param server - Ollama Server Name.
 * @returns Array of Loaded Models.
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
        const ps = await s[1].OllamaApiPs().catch(async (e: Error) => {
          await showToast({ style: Toast.Style.Failure, title: `'${s[0]}' Server`, message: e.message });
          return undefined;
        });
        if (!ps) return await Promise.resolve([] as Types.UiModel[]);
        return await Promise.all(
          ps.models.map(async (v): Promise<Types.UiModel> => {
            return {
              server: {
                name: s[0],
                ollama: s[1],
              },
              detail: v,
            };
          })
        );
      })
    )
  ).forEach((v) => (o = o.concat(v)));
  return o;
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
