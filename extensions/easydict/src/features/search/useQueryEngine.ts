import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { myPreferences } from "@/consts";
import { playQueryWordAudio } from "@/core/audio";
import { composeContent } from "@/core/content/compose";
import { buildContentView } from "@/core/content/view";
import type { LanguageItem } from "@/core/language/types";
import { QueryRunner, type QueryServiceSnapshot } from "@/core/query/QueryRunner";
import type { QueryResult } from "@/core/results/types";
import { showErrorToast } from "@/shared/errors";
import { logWarn } from "@/shared/logger";

function projectResults(results: readonly QueryResult[]) {
  const composedContent = composeContent(results, myPreferences);
  const viewSections = buildContentView(composedContent, myPreferences.flagsAreNotLanguages);
  return {
    composedContent,
    viewSections,
    isShowDetail: composedContent.isShowDetail,
    hasVisibleItems: viewSections.some((section) => section.items.length > 0),
  };
}

function createViewReader(runner: QueryRunner) {
  let snapshot = runner.getSnapshot();
  let projection = projectResults(snapshot.queryResults);
  let view = { ...snapshot, ...projection, listEpoch: 0 };
  return () => {
    const next = runner.getSnapshot();
    if (next !== snapshot) {
      if (next.queryResults !== snapshot.queryResults) projection = projectResults(next.queryResults);
      snapshot = next;
      view = { ...next, ...projection, listEpoch: projection.hasVisibleItems ? next.queryGeneration : view.listEpoch };
    }
    return view;
  };
}

export function useQueryEngine(initialFromLanguage: LanguageItem, serviceSnapshot: QueryServiceSnapshot) {
  const [runner] = useState(
    () =>
      new QueryRunner(initialFromLanguage, serviceSnapshot, {
        onError: showErrorToast,
        onAudio(word, signal) {
          void playQueryWordAudio(word, { signal }).catch((error) => {
            if (!signal.aborted) logWarn("QueryEngine", `failed to play audio for ${word.word}: ${error}`);
          });
        },
      }),
  );
  const [readView] = useState(() => createViewReader(runner));
  const view = useSyncExternalStore(runner.subscribe, readView);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) runner.dispose();
      });
    };
  }, [runner]);
  useEffect(() => runner.setServices(serviceSnapshot), [runner, serviceSnapshot]);

  return {
    ...view,
    queryText: runner.queryText,
    queryTextWithTextInfo: runner.queryTextWithTextInfo,
    regenerateService: runner.regenerateService,
    clearQueryResult: runner.clearQueryResult,
  };
}
