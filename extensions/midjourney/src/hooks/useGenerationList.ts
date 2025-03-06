import { useCachedState } from "@raycast/utils";
import { generateGUID } from "../lib/utils";
import { Generation } from "../types";

export function useGenerationList() {
  const [generations, setGenerations] = useCachedState<Generation[]>("generations", []);

  const addGeneration = (newGeneration: Partial<Generation> & Pick<Generation, "prompt" | "type" | "command">) => {
    const gen: Generation = {
      ...newGeneration,
      progress: "Waiting to start...",
      uri: "",
      timestamp: Date.now(),
      guid: generateGUID(),
    };
    setGenerations((prevList) => {
      return [...prevList, gen];
    });

    return gen;
  };

  const updateGeneration = (gen: Generation, newData: Partial<Generation>) => {
    setGenerations((prevList) => {
      const newList = [...prevList];
      const index = newList.findIndex((item) => item.guid === gen.guid);
      if (index === -1) return newList;
      newList[index] = { ...newList[index], ...newData };
      return newList;
    });
  };

  const removeGeneration = (gen: Generation) => {
    setGenerations((prevList) => {
      const newList = [...prevList];
      const index = newList.findIndex((item) => item.guid === gen.guid);
      if (index > -1) {
        newList.splice(index, 1);
      }
      return newList;
    });
  };

  return { generations, addGeneration, updateGeneration, removeGeneration };
}
