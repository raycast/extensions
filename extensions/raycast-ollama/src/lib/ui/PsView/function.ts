import { showToast, Toast } from "@raycast/api";
import { Ollama } from "../../ollama/ollama";
import { GetServerClass } from "../function";
import * as Types from "./types";

/**
 * Get Ollama Loaded Models.
 * @param server - Ollama Server Name.
 * @returns Array of Loaded Models.
 */
export async function GetModels(server: string): Promise<Types.UiModel[]> {
  let o: Types.UiModel[] = [];
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
