import { useEffect, useState } from "react";
import { Document, Tag } from "../models/paperlessResponse.model";
import { fetchDocumentTags } from "../utils/fetchDocumentTags";

export const useTags = () => {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function getTags() {
      const fetchedTags = await fetchDocumentTags();
      if (!ignore) {
        setTags(fetchedTags);
      }
    }

    let ignore = false;
    void getTags();

    return () => {
      ignore = true;
    };
  }, []);

  const stringifyTags = (doc: Document) => {
    // Returns a string of all tags for a document
    if (tags) {
      const tagNames = doc.tags.map((tag) => {
        const tagName = tags.find((tagResult) => tagResult.id === tag);
        return tagName?.name;
      });

      // Remove undefined tags (it seems that Paperless inbox associated tag is not returned by the API in the /tags path)
      const definedTags = tagNames.filter((tag) => tag);

      return definedTags?.join(", ");
    }
  };

  return { tags, stringifyTags };
};
