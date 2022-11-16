import { useEffect, useState } from "react";
import { NotebooksResponseData } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/NotebooksResponseData";
import { notebooksApi } from "./datadog-api";
import { showError } from "./util";

type State = {
  notebooksAreLoading: boolean;
  notebooks: NotebooksResponseData[];
};

export const useNotebooks = () => {
  const [{ notebooksAreLoading, notebooks }, setState] = useState<State>({
    notebooks: [],
    notebooksAreLoading: true,
  });

  useEffect(() => {
    notebooksApi
      .listNotebooks()
      .then(response => response.data || [])
      .then(notebooks => setState(prev => ({ ...prev, notebooks })))
      .catch(showError)
      .finally(() => setState(prev => ({ ...prev, notebooksAreLoading: false })));
  }, []);

  return { notebooks, notebooksAreLoading };
};
