/**
 * update date to the right thing.
 */

import { Cache } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { CONSTANTS } from "./utils";
import { ReversePullBlock } from "./type";

const graphCache = {
  create(graph: string) {
    const cache = new Cache();
    return {
      load() {
        return cache.get(graph);
      },
      save(data: string) {
        console.log(graph, data, " --- ");
        cache.set(graph, data);
      },
      on(sub: Cache.Subscriber) {
        return cache.subscribe(sub);
      },
      delete() {
        cache.remove(graph);
      },
    };
  },
};
export const graphConfigCache = graphCache.create(CONSTANTS.keys.graph);

export const saveGraphAllBlocks = (graphName: string, result: object) => {
  const graphCacheInstance = graphCache.create(CONSTANTS.keys["graph-name"](graphName));
  graphCacheInstance.save(JSON.stringify(result));
};

export const useGraphAllBlocks = (graphName: string) => {
  const [state, setState] = useState<ReversePullBlock[]>([]);
  const graphCacheInstance = graphCache.create(CONSTANTS.keys["graph-name"](graphName));
  useEffect(() => {
    const v = graphCacheInstance.load();
    if (v) {
      setState(JSON.parse(v));
    }
    graphCacheInstance.on((k, v) => {
      if (v) {
        setState(JSON.parse(v));
      } else {
        setState([]);
      }
    });
  }, []);
  return {
    data: state,
    save(obj: object) {
      graphCacheInstance.save(JSON.stringify(obj));
    },
  };
};

const rand = (max: number) => Math.floor(Math.random() * max);

export const useRandomNote = (graphName: string) => {
  const { data } = useGraphAllBlocks(graphName);
  const validBlocks = data.filter((b) => b[":block/string"] || b[":node/title"]);
  return validBlocks[rand(validBlocks.length)];
};

export const useGraphConfigCache = () => {
  const [state, setState] = useState<CachedGraphMap>({});
  useEffect(() => {
    try {
      const v = graphConfigCache.load();
      if (v) {
        const json = JSON.parse(v);
        setState(json);
      }
    } catch (e) {
      //
    }
    graphConfigCache.on((k, v) => {
      // setState((prev) => prev + 1);
      if (v) {
        setState(JSON.parse(v));
      } else {
        setState({});
      }
    });
  }, []);
  const save = (obj: CachedGraph) => {
    graphConfigCache.save(
      JSON.stringify({
        ...state,
        [obj.nameField]: obj,
      })
    );
  };
  console.log("ahahah-");
  return [state, save] as const;
};

export const useGraphCache = (name: string) => {
  const [graphAllBlocks, setGraphAllBlocks] = useCachedState(CONSTANTS.keys["graph-name"](name), {
    loading: false,
    data: [],
  });
  return [graphAllBlocks, setGraphAllBlocks] as const;
};
