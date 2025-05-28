import { useCachedPromise } from "@raycast/utils";
import { containsMySavedAlbum } from "../api/containsMySavedAlbum";

type UseContainsMySavedAlbum = {
  albumId: string;
};

export function useContainsMySavedAlbum({ albumId }: UseContainsMySavedAlbum) {
  const { data, ...rest } = useCachedPromise(
    (id) => {
      return containsMySavedAlbum({ albumId: id });
    },
    [albumId],
  );

  return { data: data?.[0], ...rest };
}
