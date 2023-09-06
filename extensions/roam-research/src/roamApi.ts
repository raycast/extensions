import dayjs from "dayjs";
import { parseTemplate, tagPageTitlesStrSuffix } from "./parse-template";
import { todayUid } from "./utils";
import * as roamApiSdk from "./roam-api-sdk-copy";
import { Cache } from "@raycast/api";

const graphPeerUrlCache = new Cache({ namespace: "graph-peer-url" });

function getCachedGraphPeerUrlIfExists(graphName: string) {
  return graphName && graphPeerUrlCache.get(graphName);
}
function setGraphPeerUrlInCache(graphName: string, peerUrl: string) {
  graphPeerUrlCache.set(graphName, peerUrl);
}
export function removeGraphPeerUrlFromCache(graphName: string) {
  return graphPeerUrlCache.remove(graphName);
}

export function initRoamBackendClient(graphName: string, graphToken: string) {
  const initGraphConfig = {
    graph: graphName,
    token: graphToken,
    peerUrl: getCachedGraphPeerUrlIfExists(graphName),
    peerUrlUpdatedCallback: setGraphPeerUrlInCache,
  };
  // console.log("fetched initGraphConfig: ", initGraphConfig);
  return roamApiSdk.initializeGraph(initGraphConfig);
}

export const BLOCK_QUERY = `:block/string :node/title :block/uid :edit/time :create/time :block/_refs {:block/_children [:block/uid :block/string :node/title {:block/_children ...}]} {:block/refs [:block/uid :block/string :node/title]}`;

export async function getBackRefs(backendClient: roamApiSdk.RoamBackendClient, uid: string) {
  const backRefsReversePullBlocks: ReversePullBlock[] = await roamApiSdk.q(
    backendClient,
    `[ :find [(pull ?e [${BLOCK_QUERY}]) ...]  :where [?page :block/uid  "${uid}"] [?e :block/refs ?page] [?e :block/string ?text]]`
  );
  return backRefsReversePullBlocks;
}

const graphPagesAndTimeCache = new Cache({ namespace: "graph-pages" });
const GRAPH_PAGES_CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;

type GraphPagesDataInCache = [number, Record<string, string>];

async function getAllPagesBackend(graphConfig: GraphConfig) {
  // console.log("getAllPagesBackend: about to hit backend for getAllPages for graph: ", graphConfig);
  const backendClient: roamApiSdk.RoamBackendClient = initRoamBackendClient(
    graphConfig.nameField,
    graphConfig.tokenField
  );
  const allPagesData: [string, string][] = await roamApiSdk.q(
    backendClient,
    "[:find ?uid ?page-title :where [?id :node/title ?page-title][?id :block/uid ?uid]]"
  );
  const res: { [key: string]: string } = {};
  for (const [blockUid, nodeTitle] of allPagesData) {
    res[blockUid] = nodeTitle;
  }
  const valueForCache: GraphPagesDataInCache = [Date.now(), res];
  // set it in the cache
  graphPagesAndTimeCache.set(graphConfig.nameField, JSON.stringify(valueForCache));
  return res;
}

// Cached meaning that this does NOT do the getAllPages query to backend more than once every 2 hours i.e. GRAPH_PAGES_CACHE_EXPIRY_MS
// Only want this type of caching for this request right now, if we want for others too,
//    would probably be more well off writing another version of raycast util's `useCachedPromise` hook
export function getAllPagesCached(graphConfig: GraphConfig) {
  // console.log("getAllPagesCached: graphConfig: ", graphConfig)
  const valFromCacheJsonStr = graphPagesAndTimeCache.get(graphConfig.nameField);
  // console.log("getAllPagesCached: valFromCacheJsonStr: ", valFromCacheJsonStr);
  if (!valFromCacheJsonStr) {
    return getAllPagesBackend(graphConfig);
  }
  const valFromCache: GraphPagesDataInCache = JSON.parse(valFromCacheJsonStr);
  if (!(valFromCache && valFromCache.length == 2 && valFromCache[0] && valFromCache[1])) {
    return getAllPagesBackend(graphConfig);
  }
  const useValFromCache = Date.now() - valFromCache[0] < GRAPH_PAGES_CACHE_EXPIRY_MS;
  if (useValFromCache) {
    return Promise.resolve(valFromCache[1]);
  } else {
    return getAllPagesBackend(graphConfig);
  }
}

export function appendToPageOrDailyNote(
  backendClient: roamApiSdk.RoamBackendClient,
  content: string,
  template: string,
  date: Date,
  pageTitlesToTagTopBlockWith: string[],
  // if pageUid is not provided, it appends to today's daily note page
  existingPageUid?: string
) {
  // TODO: don't really like this function since there is a lot of code copying between this and parseTemplate but okay for now. Refactor/Clean it up later
  // console.log(
  //   "appendToPageOrDailyNote called with: existingPageUid and pageTitlesToTagTopBlockWith: ",
  //   existingPageUid,
  //   pageTitlesToTagTopBlockWith
  // );
  if (template && template.startsWith("-")) {
    const replaceDate = (s: string) => {
      return s.replaceAll(/\{date:?([^}]+)?\}/gi, (a1: string, a2 = "HH:mm") => {
        return dayjs(date).format(a2);
      });
    };
    const replaceContent = (s: string) => {
      return s.replaceAll(/\{content}/gi, content);
    };

    return roamApiSdk.batchActions(backendClient, {
      action: "batch-actions",
      actions: parseTemplate(replaceContent(replaceDate(template)), pageTitlesToTagTopBlockWith, existingPageUid),
    });
  } else {
    const finalStr = content + tagPageTitlesStrSuffix(pageTitlesToTagTopBlockWith);
    if (existingPageUid) {
      return roamApiSdk.createBlock(backendClient, {
        location: {
          "parent-uid": existingPageUid,
          order: "last",
        },
        block: {
          string: finalStr,
        },
      });
    } else {
      return roamApiSdk.createBlock(backendClient, {
        location: {
          "page-title": { "daily-note-page": todayUid() },
          order: "last",
        },
        block: {
          string: finalStr,
        },
      });
    }
  }
}
