import { useFetch } from "@raycast/utils";
import { DATA_URL } from "../config";
import { Doc } from "../types";

type ResponseType = {
  docs: Doc[];
};
export const useDocuments = () => {
  const { data, isLoading } = useFetch<ResponseType>(DATA_URL);
  return { documents: data?.docs.filter((doc) => doc.text.length > 0), isLoading };
};
