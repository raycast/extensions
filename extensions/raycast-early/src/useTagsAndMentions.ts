import { useEffect, useState } from "react";
import { Mention, Tag } from "./types";
import { apiListAllTagsAndMentions } from "./api-early";
import { showError } from "./utils";

export const useTagsAndMentions = () => {
  const [{ tags, mentions }, setTagsAndMentions] = useState({ tags: [] as Tag[], mentions: [] as Mention[] });

  const addTags = (newTags: Tag[]) => {
    const full = tags.concat(newTags);

    setTagsAndMentions(prev => ({ ...prev, tags: full }));

    return full;
  };

  useEffect(() => {
    apiListAllTagsAndMentions().then(setTagsAndMentions).catch(showError);
  }, []);

  return { tags, mentions, addTags };
};
