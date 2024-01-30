import { environment } from "@raycast/api";
import { CachedPromiseOptions, useCachedPromise } from "@raycast/utils";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { SetStateAction, useCallback } from "react";
import { z } from "zod";

import { LocalPopiconsErrorReason } from "../enums/local-popicons-error-reason";
import { LocalPopiconsError } from "../errors/local-popicons-error";
import { Popicon } from "../schemas/popicon";
import { attempt } from "../utilities/attempt";
import { raise } from "../utilities/raise";

const INITIAL_ICONS_PATH = path.join(environment.assetsPath, "popicons.json");

async function loadLocalPopicons() {
  const data = await attempt(async () => await readFile(INITIAL_ICONS_PATH, { encoding: "utf-8" }))
    .fallback(() => raise(new LocalPopiconsError(LocalPopiconsErrorReason.AssetNotReadable)))
    .run();

  const parsedJson = attempt(() => JSON.parse(data))
    .fallback(() => raise(new LocalPopiconsError(LocalPopiconsErrorReason.InvalidJson)))
    .run();

  const icons = attempt(() => z.array(Popicon).parse(parsedJson))
    .fallback(() => raise(new LocalPopiconsError(LocalPopiconsErrorReason.FailedValidation)))
    .run();

  return icons;
}

function useLocalPopicons(options?: CachedPromiseOptions<typeof loadLocalPopicons, undefined>) {
  const { data: icons, isLoading, error, mutate, revalidate } = useCachedPromise(loadLocalPopicons, [], options);

  const setIcons = useCallback(
    async (update: SetStateAction<Array<Popicon>>, options?: Partial<{ onError: (err: unknown) => void }>) => {
      try {
        const newIcons = typeof update === "function" ? update(icons ?? []) : update;

        await mutate(writeFile(INITIAL_ICONS_PATH, JSON.stringify(newIcons)), {
          optimisticUpdate: () => {
            return newIcons;
          },
          shouldRevalidateAfter: true,
        });
      } catch (err) {
        if (options?.onError) {
          options.onError(err);
        } else {
          throw err;
        }
      }
    },
    [mutate]
  );

  return { icons, isLoading, error, revalidate, setIcons };
}

export { useLocalPopicons };
