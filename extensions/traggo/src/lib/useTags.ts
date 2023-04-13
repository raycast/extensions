import { useEffect, useState } from "react";
import { Tag } from "./types";
import { useTagsQuery } from "../graphql/tags.hook";
import { apolloClient } from "./apolloClient";
import { useSuggestTagValueLazyQuery } from "../graphql/suggestTagValue.hook";

export const useTagsWithValues = ({ skip }: { skip: boolean }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: tagsResponse } = useTagsQuery({
    client: apolloClient,
    skip,
  });
  const [suggestValues] = useSuggestTagValueLazyQuery({
    client: apolloClient,
  });

  useEffect(() => {
    void (async () => {
      if (!tagsResponse?.tags) {
        return;
      }
      const tagsWithValues = await Promise.all(
        tagsResponse.tags.flatMap(async ({ key, color }) => {
          const { data: valueSuggestions } = await suggestValues({
            variables: {
              key,
              query: "", // empty query to get all values
            },
          });
          return (
            valueSuggestions?.suggestTagValue?.map((value) => ({ id: `${key}:${value}`, key, value, color })) ?? []
          );
        })
      );

      setTags(tagsWithValues.flat());
      setLoading(false);
    })();
  }, [tagsResponse]);

  return { tags, loading };
};
