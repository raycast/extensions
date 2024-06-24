import { useCTFetch } from "./useCTFetch";
import { DomainObjectSchema } from "../schemas/DomainObjectSchema";
import { z } from "zod";

const domainTypesToSearch = ["person", "group", "wiki_page", "song"].map((t) => `domain_types[]=${t}`).join("&");

export const useSearch = (query: string) => {
  const { data, isLoading } = useCTFetch(`/search?query=${query}&${domainTypesToSearch}`, {
    execute: query.length > 3,
  });

  const domainObjects = z.array(DomainObjectSchema).safeParse(data)?.data ?? [];

  return {
    domainObjects,
    isLoading,
  };
};
