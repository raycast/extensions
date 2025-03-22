import { AbortError } from "node-fetch";
import { MutableRefObject, useCallback, useState } from "react";
import { checkInEpisode } from "../api/shows";

export const useEpisodeMutations = (abortable: MutableRefObject<AbortController | undefined>) => {
  const [error, setError] = useState<Error | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const checkInEpisodeMutation = useCallback(
    async (episode: TraktEpisodeListItem) => {
      try {
        await checkInEpisode(episode.ids.trakt, abortable.current?.signal);
        setSuccess("Episode checked in");
      } catch (e) {
        if (!(e instanceof AbortError)) {
          setError(e as Error);
        }
      }
    },
    [abortable],
  );

  return {
    checkInEpisodeMutation,
    error,
    success,
  };
};
