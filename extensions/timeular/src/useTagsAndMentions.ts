import { useEffect, useState } from "react";
import { Mention, Tag } from "./types";
import { apiListAllTagsAndMentions } from "./api-timeular";

export const useTagsAndMentions = () => {
  const [{ tags, mentions }, setTagsAndMentions] = useState({ tags: [] as Tag[], mentions: [] as Mention[] });

  const addTags = (newTags: Tag[]) => {
    const full = tags.concat(newTags);

    setTagsAndMentions(prev => ({ ...prev, tags: full }));

    return full;
  };

  useEffect(() => {
    apiListAllTagsAndMentions().then(setTagsAndMentions);
  }, []);

  return { tags, mentions, addTags };
};
