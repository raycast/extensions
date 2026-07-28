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
import type { QueryResult, QueryType } from "@/types/query";

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
  queryRecordList: QueryType[];

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
}

/**
 * Discriminated union of all state transitions.
 * Each action type maps to a specific reducer case.
 */
export type QueryAction =
  /** A new query started (e.g., Bing Translate request fired). Add to pending list. */
  | { type: "START_QUERY"; queryType: QueryType; generation: number }
  /** A query finished (success or error). Remove from pending list. */
  | { type: "FINISH_QUERY"; queryType: QueryType; generation: number }
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
      // Dedup: don't add if already tracking this query type
      if (state.queryRecordList.includes(action.queryType)) return state;
      return {
        ...state,
        queryRecordList: [...state.queryRecordList, action.queryType],
        isLoading: true,
      };
    }

    case "FINISH_QUERY": {
      // Remove from pending list; if list becomes empty, all queries finished
      const newList = state.queryRecordList.filter((t) => t !== action.queryType);
      if (newList.length === state.queryRecordList.length) return state;
      return { ...state, queryRecordList: newList, isLoading: newList.length > 0 };
    }

    case "SET_RESULT": {
      const { queryResult } = action;

      // Replace existing result of same type (or add new one)
      let results = state.queryResults.filter((r) => r.type !== queryResult.type);
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
