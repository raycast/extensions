import { useEffect, useState } from "react";
import { PostType } from "./types";

export function useReactionFiltering(rawData: PostType[]) {
  const [selectedReaction, setSelectedReaction] = useState<string>("");
  const [filteredData, setFilteredData] = useState<PostType[]>([]);

  useEffect(() => {
    if (selectedReaction && selectedReaction !== "") {
      setFilteredData(rawData?.filter((post) => post.reactions.some((reaction) => reaction.name === selectedReaction)));
    } else {
      setFilteredData(rawData);
    }
  }, [selectedReaction, rawData]);

  return { selectedReaction, setSelectedReaction, filteredData };
}
