import { useFetch } from "@raycast/utils";
import type { CharacterEntity } from "crossbell";

export function useCharacter(characterId?: number) {
  const { isLoading, data } = useFetch<CharacterEntity>(`https://indexer.crossbell.io/v1/characters/${characterId}`, {
    execute: Boolean(characterId),
  });

  return {
    isLoading,
    data,
  };
}

export function useCharacterByHandle(handle?: string) {
  const { isLoading, data } = useFetch<CharacterEntity>(`https://indexer.crossbell.io/v1/handles/${handle}/character`, {
    execute: Boolean(handle),
  });

  return {
    isLoading,
    data,
  };
}
