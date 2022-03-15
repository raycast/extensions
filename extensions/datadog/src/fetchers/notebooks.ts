import { NotebooksResponseData } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/NotebooksResponseData";
import { Caches } from ".";
import { notebooksApi } from "../clients/datadog";
import { useLocalState } from "./cache";

type State = {
  notebooks: NotebooksResponseData[];
};

export const useNotebooks = () => {
  const loader = () => {
    return notebooksApi
      .listNotebooks()
      .then(response => response.data || [])
      .then(notebooks => ({ notebooks: notebooks } as State));
  };

  const {
    state,
    updateAndSaveState,
    loading: notebooksAreLoading,
  } = useLocalState<State>(Caches.Notebooks, { notebooks: [] }, loader);

  return { state, updateAndSaveState, notebooksAreLoading };
};
