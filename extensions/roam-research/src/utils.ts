import { useRef, useCallback } from "react";
import dayjs from "dayjs";
import { usePersistentState } from "raycast-toolkit";

// hook that you should use to get graph settings like name, token
// this stores it in Raycast's encrypted localstorage
// note that we DO NOT store this in Raycast's cache because it's unsecure and because it's an LRU cache, it can remove least recently used data when more than 10 MB in cache
// might want to move this to someplace like `./roamApi.ts`
export const useGraphsConfig: () => {
  graphsConfig: GraphsConfigMap;
  saveGraphConfig: (obj: GraphConfig) => void;
  removeGraphConfig: (graphName: string) => void;
  isGraphsConfigLoading: boolean;
} = () => {
  // TODO: usePersistentState has an error when even when we do `setGraphsConfig`, `graphsConfig` does not change/cause rerenders
  const [graphsConfig, setGraphsConfig, isGraphsConfigLoading] = usePersistentState<GraphsConfigMap>(
    "graphs-config",
    {}
  );
  const saveGraphConfig = (obj: GraphConfig) => {
    setGraphsConfig({
      ...graphsConfig,
      [obj.nameField]: obj,
    });
  };
  const removeGraphConfig = (graphName: string) => {
    const newGraphsConfig = { ...graphsConfig };
    delete newGraphsConfig[graphName];
    setGraphsConfig(newGraphsConfig);
  };
  // console.log("Loaded graphsConfig: ", graphsConfig);
  return { graphsConfig, saveGraphConfig, removeGraphConfig, isGraphsConfigLoading } as const;
};

export const keys = <T extends object>(obj: T) => {
  return Object.keys(obj) as (keyof T)[];
};

export const values = <T extends object>(obj: T) => {
  return Object.values(obj) as (keyof T)[];
};

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useEvent = <T, D>(cb: (...atgs: T[]) => D) => {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  return useCallback((...args: T[]) => {
    return cbRef.current(...args);
  }, []);
};

export const timeformatFromMs = (n?: number) => {
  return dayjs(n).format("HH:mm:ss YYYY-MM-DD");
};

const replaceMarkdownMap = {
  // github style TODO and DONE. Can be used because Raycast is using https://github.com/apple/swift-markdown which is powered by GitHub-flavored Markdown's cmark-gfm implementation: https://github.com/github/cmark-gfm
  "{{[[TODO]]}}": "- [ ]",
  "{{[[DONE]]}}": "- [x]",
  // have to do this otherwise first few lines of the code block appear outside of the codeblock
  "```": "```\n\n",
};

const detailMarkdownHelper = (block: ReversePullBlock, searchStr: string | null = null) => {
  // would love if we could highight the search matches, but CommonMark does not seem to support it
  //   asked if there is a workaround in the Raycast Slack: https://raycastcommunity.slack.com/archives/C02HEMAF2SJ/p1690456636469459
  //   in the absence of that, will do both bold and italics
  //   This is not as desirable as it is not as apparent and can still cause issues if block already has such formatting
  let mainBlockStr: string = block[":block/string"] || block[":node/title"] || "";
  for (const [key, value] of Object.entries(replaceMarkdownMap)) {
    mainBlockStr = mainBlockStr.replaceAll(key, value);
  }
  if (!mainBlockStr.startsWith("```")) {
    // if code block, do not do any of the following replacements
    if (block[":block/refs"]) {
      for (const ref of block[":block/refs"]) {
        if (ref[":block/string"]) {
          mainBlockStr = mainBlockStr.replaceAll("((" + ref[":block/uid"] + "))", "((" + ref[":block/string"] + "))");
        }
      }
    }
    if (searchStr) {
      // console.log("searchStr", searchStr.split(" "));
      for (const word of searchStr.split(" ")) {
        // to make this better, would want to NOT do this in places like inside code blocks where it wouldn't work anyways
        mainBlockStr = mainBlockStr.replace(new RegExp(word, "i"), function (match: string) {
          return "***" + match + "***";
        });
      }
    }
  }
  if (block?.[":node/title"]) {
    return `Page: [[${mainBlockStr}]]`;
  } else {
    const strs: string[] = [];
    let ary = block?.[":block/_children"];
    // console.log(JSON.stringify(block));
    while (ary && ary.length) {
      const b = ary[0];
      // console.log(b, " = b");
      strs.unshift(b[":block/string"] || b[":node/title"] || "");
      ary = b[":block/_children"];
      // console.log(ary, "----", b[":block/_children"], strs);
    }
    return `${strs.join("  >  ")}\n\n---
${mainBlockStr}

                `;
  }
};

export const detailMarkdown = (block: ReversePullBlock, searchStr: string | null = null) => {
  const res: string = detailMarkdownHelper(block, searchStr);
  // size is mostly an issue for large code blocks. If we do not truncate these then they cause beachball and require force quit of Raycast
  if (res.length > 5000) {
    return res.substring(0, 5000) + "\n\n\n TRUNCATED RESULT: Go to the block in Roam to view in full";
  } else {
    return res;
  }
};

export const todayUid = () => {
  return dayjs().format("MM-DD-YYYY");
};
