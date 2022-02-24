import { NotebooksResponseData } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/NotebooksResponseData";
import { notebooksApi } from "./datadog-api";
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

  const [state, notebooksAreLoading] = useLocalState<State>("notebooks", { notebooks: [] }, loader);

  return { state, notebooksAreLoading };
};
