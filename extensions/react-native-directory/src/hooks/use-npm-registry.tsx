import { useFetch } from "@raycast/utils";

type NpmRegistryData = {
  name: string;
  version: string;
  author?:
    | {
        name: string;
        email?: string;
        url?: string;
      }
    | string;
  maintainers?: Array<{
    name: string;
    email?: string;
  }>;
};

export const useNpmRegistry = (npmPkg: string) => {
  const { data, isLoading, error } = useFetch<NpmRegistryData | null>(`https://registry.npmjs.org/${npmPkg}/latest`, {
    parseResponse: async (response): Promise<NpmRegistryData | null> => {
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as NpmRegistryData;
    },
  });

  const authorName = data ? getAuthorName(data.author) : undefined;

  return {
    registryData: data,
    authorName,
    isLoadingRegistry: isLoading,
    registryError: error,
  };
};

const getAuthorName = (author: NpmRegistryData["author"]): string | undefined => {
  if (!author) return undefined;
  if (typeof author === "string") return author;
  return author.name;
};
