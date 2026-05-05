import { getPreferenceValues } from "@raycast/api";
import { useCallback } from "react";
import { useCachedStorage } from "../hooks/storage";
import { OWL, OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";

const HISTORY_DEPTH = 20;

export function getHistoryDepth(): number {
  const preferences = getPreferenceValues<Preferences>();

  const historyDepth =
    !Number.isNaN(preferences["history-depth"]) && !Number.isNaN(parseInt(preferences["history-depth"]))
      ? parseInt(preferences["history-depth"])
      : HISTORY_DEPTH;

  return Math.max(0, historyDepth);
}

export type UseOWLs = {
  owls: OWLMapping;
  setOWLs: React.Dispatch<React.SetStateAction<OWLMapping>>;

  addOWL: (owl: OWL) => void;
  removeOWL: (owl: OWL | string) => void;
  pushHistory: (owl: OWL, input: string, output: string) => void;
};

export function useOWLs(): UseOWLs {
  const [owls, setOWLs] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});

  const addOWL = useCallback<UseOWLs["addOWL"]>(
    (owl) => {
      setOWLs((previousState) => ({
        ...previousState,
        [owl.from]: {
          ...previousState[owl.from],
          owl,
        },
      }));
    },
    [setOWLs],
  );

  const removeOWL = useCallback<UseOWLs["removeOWL"]>(
    (owl) => {
      setOWLs((previousState) => {
        const actualOwl =
          typeof owl === "string"
            ? Object.values(previousState)
                .flat(1)
                .find((existingOwl) => existingOwl.id === owl)
            : owl;

        if (!actualOwl) {
          return previousState;
        }

        return {
          ...previousState,
          [actualOwl.from]: previousState[actualOwl.from].filter((existingOwl) => existingOwl.id !== actualOwl.id),
        };
      });
    },
    [setOWLs],
  );

  const pushHistory = useCallback<UseOWLs["pushHistory"]>(
    (owl, input, output) => {
      setOWLs((previousState) => ({
        ...previousState,
        [owl.from]: previousState[owl.from].map((existingOwl) => {
          if (existingOwl.id !== owl.id) {
            return existingOwl;
          }

          return {
            ...existingOwl,
            history: [
              ...(existingOwl.history || []),
              {
                input,
                output,
                timestamp: new Date(),
              },
            ]
              .toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .slice(0, getHistoryDepth()),
          };
        }),
      }));
    },
    [setOWLs],
  );

  return {
    owls,
    setOWLs,
    addOWL,
    removeOWL,
    pushHistory,
  };
}
