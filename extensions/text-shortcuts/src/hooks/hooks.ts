import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ANNOTATIONS_SHORTCUTS } from "../build-in-shortcuts/annotation";
import { CASES_SHORTCUTS } from "../build-in-shortcuts/case";
import { CODERS_SHORTCUTS } from "../build-in-shortcuts/coder";
import { DELETIONS_SHORTCUTS } from "../build-in-shortcuts/deletion";
import { FORMAT_SHORTCUTS } from "../build-in-shortcuts/format";
import { MARKDOWNS_SHORTCUTS } from "../build-in-shortcuts/markdown";
import { TIMES_SHORTCUTS } from "../build-in-shortcuts/time";
import { Preferences } from "../types/preferences";
import { fetchItemInput } from "../util/input";
import { runShortcut, Shortcut } from "../util/shortcut";

export const getShortcuts = (refresh: number, preferences: Preferences) => {
  const [userShortcuts, setUserShortcuts] = useState<Shortcut[]>([]);
  const [buildInShortcuts, setBuildInShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    //get shortcuts list
    //user shortcuts
    setLoading(true);
    const _localStorage = await LocalStorage.getItem<string>("shortcuts");
    let _userShortcuts: Shortcut[] = [];
    if (typeof _localStorage == "string") {
      _userShortcuts = JSON.parse(_localStorage);
      setUserShortcuts(_userShortcuts);
    }
    //build-inshortcuts
    let _buildInShortcuts: Shortcut[] = [];
    if (preferences.annotation) {
      _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(ANNOTATIONS_SHORTCUTS)];
    }
    if (preferences.caser) {
      _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(CASES_SHORTCUTS)];
    }
    if (preferences.coder) {
      _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(CODERS_SHORTCUTS)];
    }
    if (preferences.deletion) {
      _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(DELETIONS_SHORTCUTS)];
    }
    if (preferences.format) {
      _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(FORMAT_SHORTCUTS)];
    }
    if (preferences.markdown) {
      _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(MARKDOWNS_SHORTCUTS)];
    }
    if (preferences.time) {
      _buildInShortcuts = [..._buildInShortcuts, ...JSON.parse(TIMES_SHORTCUTS)];
    }
    setBuildInShortcuts(_buildInShortcuts);
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    userShortcuts: userShortcuts,
    buildInShortcuts: buildInShortcuts,
    allShortcuts: [...userShortcuts, ...buildInShortcuts],
    loading: loading,
  };
};

export const getShortcutsListDetail = (allShortcuts: Shortcut[], selectId: string, refresh: number) => {
  const [detail, setDetail] = useState<string>("");
  const fetchData = useCallback(async () => {
    //get shortcuts list detail
    if (allShortcuts.length > 0) {
      const _inputItem = await fetchItemInput();
      const selectShortcut = allShortcuts.find((shortcut) => shortcut.id === selectId);
      if (selectShortcut) {
        setDetail(runShortcut(_inputItem, selectShortcut.tactions));
      }
    }
  }, [selectId, refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { detail: detail };
};
