import { useCallback, useEffect, useState } from "react";
import { runShortcut, Shortcut } from "../util/shortcut";
import { LocalStorage } from "@raycast/api";
import { ANNOTATIONS_SHORTCUTS } from "../build-in-shortcuts/annotation";
import { CASES_SHORTCUTS } from "../build-in-shortcuts/case";
import { CODERS_SHORTCUTS } from "../build-in-shortcuts/coder";
import { FORMAT_SHORTCUTS } from "../build-in-shortcuts/format";
import { MARKDOWNS_SHORTCUTS } from "../build-in-shortcuts/markdown";
import { TIMES_SHORTCUTS } from "../build-in-shortcuts/time";
import { fetchItemInput, fetchItemInputSelectedFirst } from "../util/input";
import { Preferences } from "../types/preferences";
import { DELETIONS_SHORTCUTS } from "../build-in-shortcuts/deletion";

export const getShortcuts = (refresh: number, preferences: Preferences) => {
  const [userShortcuts, setUserShortcuts] = useState<Shortcut[]>([]);
  const [allShortcuts, setAllShortcuts] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    //get shortcuts list
    //user shortcuts
    setLoading(true);
    const _localStorage = await LocalStorage.getItem<string>("shortcuts");
    let _userShortcuts = [];
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
    setAllShortcuts([..._userShortcuts.concat(_buildInShortcuts)]);
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { allShortcuts: allShortcuts, userShortcuts: userShortcuts, loading: loading };
};

export const getShortcutsListDetail = (allShortcuts: Shortcut[], selectId: number, refresh: number) => {
  const [detail, setDetail] = useState<string>("");
  const fetchData = useCallback(async () => {
    //get shortcuts list detail
    if (allShortcuts.length > 0) {
      const _inputItem = await fetchItemInput();
      setDetail(runShortcut(_inputItem, allShortcuts[selectId].tactions));
    }
  }, [selectId, refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { detail: detail };
};
