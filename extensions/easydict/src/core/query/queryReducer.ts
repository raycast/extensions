/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

/**
 * Query Reducer — centralized state management for the translation/dictionary query system.
 *
 * Architecture:
 * - QueryState: the single source of truth for all query-related UI state
 * - QueryAction: discriminated union of all possible state transitions
 * - queryReducer: pure function that computes next state from current state + action
 * - Cross-service coupling: declarative rules in couplingRules.ts
 */

import type { LanguageItem } from "@/core/language/types";
import type { QueryResult } from "@/types/query";

import { COUPLING_RULES } from "./couplingRules";
import { checkIfShowTranslationDetail, sortedQueryResults } from "./utils";

export interface QueryState {
  /**
   * All results belonging to the active query generation, sorted by user
   * preference order via sortedQueryResults.
   * Updated by SET_RESULT; cleared when a new query starts or by CLEAR_ALL.
   */
  queryResults: QueryResult[];

  /**
   * In-flight query types (e.g., ["Bing Translate", "Youdao Dictionary"]).
   * Used to track which queries are still pending. When this array is empty,
   * all queries have finished and isLoading becomes false.
   * Updated by START_QUERY / FINISH_QUERY actions.
   */
  queryRecordList: string[];

  isLoading: boolean;

  /**
   * Whether to show detail view (right panel with full translation text).
   */
  isShowDetail: boolean;

  /**
   * Detected source language — updated after language detection completes.
   */
  currentFromLanguageItem: LanguageItem;

  /**
   * Auto-selected target language. May differ from user selection when
   * source and target languages conflict (e.g., translating English to English
   * auto-switches to Chinese).
   */
  autoSelectedTargetLanguageItem: LanguageItem;

  /**
   * Current query session generation. Incremented on every new query.
   * Actions from older generations are ignored.
   */
  activeGeneration: number;

  /**
   * Generation whose visible results mounted the native List. It changes only
   * when a query first produces a visible item, so the List mounts with content
   * without remounting the search field while the user types.
   */
  listEpoch: number;
}

/**
 * Discriminated union of all state transitions.
 * Each action type maps to a specific reducer case.
 */
export type QueryAction =
  /** A new query started (e.g., Bing Translate request fired). Add to pending list. */
  | { type: "START_QUERY"; serviceId: string; generation: number }
  /** A query finished (success or error). Remove from pending list. */
  | { type: "FINISH_QUERY"; serviceId: string; generation: number }
  /** API returned a result. Add/update in queryResults, trigger cross-service coupling. */
  | { type: "SET_RESULT"; queryResult: QueryResult; generation: number }
  /** Language detection completed. Update source and target language display. */
  | {
      type: "SET_DETECTED_LANGUAGE";
      fromLanguageItem: LanguageItem;
      targetLanguageItem: LanguageItem;
      generation: number;
    }
  /** User manually selected a target language. Update target language display. */
  | { type: "SET_TARGET_LANGUAGE"; targetLanguageItem: LanguageItem }
  /** Clear all results and reset loading state (e.g., when input is cleared). */
  | { type: "CLEAR_ALL"; generation: number }
  /** Prepare for a new query: clear previous results and pending queries, then show loading. */
  | { type: "RESET_FOR_NEW_QUERY"; generation: number }
  /** Check if any queries are pending; if not, stop the loading spinner. */
  | { type: "CHECK_PENDING_QUERIES"; generation: number };

/**
 * Pure reducer function. Computes next state from current state + action.
 *
 * Rules:
 * - Must be pure: no side effects, no async operations
 * - Must return new state object (immutable updates via spread)
 * - May return current state if action is a no-op (e.g., duplicate START_QUERY)
 */
export function queryReducer(state: QueryState, action: QueryAction): QueryState {
  if ("generation" in action) {
    if (action.type !== "RESET_FOR_NEW_QUERY" && action.type !== "CLEAR_ALL") {
      if (action.generation !== state.activeGeneration) {
        return state;
      }
    }
  }

  switch (action.type) {
    case "START_QUERY": {
      if (state.queryRecordList.includes(action.serviceId)) return state;
      return {
        ...state,
        queryRecordList: [...state.queryRecordList, action.serviceId],
        isLoading: true,
      };
    }

    case "FINISH_QUERY": {
      // Remove from pending list; if list becomes empty, all queries finished
      const newList = state.queryRecordList.filter((id) => id !== action.serviceId);
      if (newList.length === state.queryRecordList.length) return state;
      return { ...state, queryRecordList: newList, isLoading: newList.length > 0 };
    }

    case "SET_RESULT": {
      const { queryResult } = action;

      let results = state.queryResults.filter((result) => result.serviceId !== queryResult.serviceId);
      results.push(queryResult);

      // Sort by user preference order
      results = sortedQueryResults(results);

      // Apply cross-service coupling
      for (const rule of COUPLING_RULES) {
        if (rule.triggers.includes(queryResult.type)) {
          results = rule.apply(results);
        }
      }

      return {
        ...state,
        queryResults: results,
        listEpoch: hasVisibleListItems(results) ? action.generation : state.listEpoch,
        isShowDetail: checkIfShowTranslationDetail(results),
      };
    }

    case "SET_DETECTED_LANGUAGE": {
      return {
        ...state,
        currentFromLanguageItem: action.fromLanguageItem,
        autoSelectedTargetLanguageItem: action.targetLanguageItem,
      };
    }

    case "SET_TARGET_LANGUAGE": {
      return {
        ...state,
        autoSelectedTargetLanguageItem: action.targetLanguageItem,
      };
    }

    case "CLEAR_ALL": {
      return {
        ...state,
        activeGeneration: action.generation,
        queryResults: [],
        queryRecordList: [],
        isLoading: false,
        isShowDetail: false,
      };
    }

    case "RESET_FOR_NEW_QUERY": {
      // Start a fresh query session. Previous results must be cleared because
      // the set of participating providers may differ between queries.
      return {
        ...state,
        activeGeneration: action.generation,
        queryResults: [],
        queryRecordList: [],
        isLoading: true,
        isShowDetail: false,
      };
    }

    case "CHECK_PENDING_QUERIES": {
      if (state.queryRecordList.length === 0) {
        return { ...state, isLoading: false };
      }
      return state;
    }

    default:
      return state;
  }
}

function hasVisibleListItems(results: QueryResult[]): boolean {
  return results.some(
    (result) =>
      (!("hideDisplay" in result) || !result.hideDisplay) &&
      result.displaySections.some((section) => section.items.length > 0),
  );
}
