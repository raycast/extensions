import { useCachedState } from "@raycast/utils";
import { useGraphCache } from "./cache";
import { graphApiInitial } from "./roamApi";
import { CONSTANTS, keys } from "./utils";

const useUpdateCache = async (graphCache: CachedGraph) => {
  const [graphAllBlocks, setGraphAllBlocks] = useGraphCache(graphCache.nameField);

  setGraphAllBlocks((prev) => {
    return {
      ...prev,
      loading: true,
    };
  });
  console.log("gggg", graphCache);

  await graphApiInitial(graphCache.nameField, graphCache.tokenField)
    .getAllBlocks()
    .then((response) => {
      console.log("hahahah");
      setGraphAllBlocks({ data: response.result as [], loading: false });
    })
    .then((e) => {
      console.log(e, " = e");
      setGraphAllBlocks((prev) => {
        return {
          ...prev,
          loading: false,
        };
      });
    });
  console.log(graphAllBlocks, " ---");
};

export default function Background() {
  const [graphs] = useCachedState(CONSTANTS.keys.graph, {} as CachedGraphMap);
  console.log(graphs, " --");
  keys(graphs).forEach((graphName) => {
    console.log(graphName);
    useUpdateCache(graphs[graphName] as any);
  });
}
