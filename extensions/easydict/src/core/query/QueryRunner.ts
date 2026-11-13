import { myPreferences } from "@/consts";
import { config } from "@/core/config";
import { detectLanguage } from "@/core/detect";
import { englishLanguageItem } from "@/core/language/consts";
import type { LanguageItem } from "@/core/language/types";
import { getLanguageItem } from "@/core/language/utils";
import type {
  QueryInput,
  QueryResult,
  QueryWordInfo,
  RuntimeServiceConfig,
  TranslationResult,
} from "@/core/results/types";
import type { DictionaryServiceConfig } from "@/providers/dictionary";
import type { TranslationServiceConfig } from "@/providers/translation";
import { CancelledError, RequestError } from "@/shared/errors";
import { logTrace } from "@/shared/logger";

import {
  cacheLanguageDetection,
  cacheQueryResult,
  getCachedLanguageDetection,
  getCachedQueryResult,
  getQueryCacheGeneration,
} from "./cache";

export interface QueryServiceSnapshot {
  translationServices: TranslationServiceConfig[];
  dictionaryServices: DictionaryServiceConfig[];
}

interface QueryOptions {
  bypassCache?: boolean;
}

interface ServiceRequest {
  serviceId: string;
  controller: AbortController;
  signal: AbortSignal;
  running: boolean;
}

interface QuerySession {
  controller: AbortController;
  phase: { kind: "detecting" } | { kind: "ready"; input: QueryInput } | { kind: "failed" };
  cacheGeneration: number;
  requests: Map<string, ServiceRequest>;
  audioPlayed: boolean;
}

interface QuerySnapshot {
  readonly queryResults: readonly QueryResult[];
  queryGeneration: number;
  isLoading: boolean;
  currentFromLanguageItem: LanguageItem;
}

interface QueryEffects {
  onError: (error: unknown) => void;
  onAudio: (word: QueryWordInfo, signal: AbortSignal) => void;
}

function serviceMetadata(service: RuntimeServiceConfig) {
  return { serviceId: service.id, serviceLabel: service.label, serviceOrder: service.order, serviceIcon: service.icon };
}

/** Auto-select the preferred target language that differs from the detected source language. */
function getAutoSelectedTargetLanguageItem(fromLangCode: string): LanguageItem {
  const targetLanguageItem = config.preferredLanguages.find(
    (languageItem) => languageItem.youdaoLangCode !== fromLangCode,
  ) as LanguageItem;
  logTrace("QueryRunner", `fromLangCode: ${fromLangCode}, auto selected target: ${targetLanguageItem.youdaoLangCode}`);
  return targetLanguageItem;
}

/** Owns one command's active query and service requests; React only subscribes. */
export class QueryRunner {
  private session?: QuerySession;
  private listeners = new Set<() => void>();
  private snapshot: QuerySnapshot;

  constructor(
    initialFromLanguage: LanguageItem,
    private services: QueryServiceSnapshot,
    private effects: QueryEffects,
  ) {
    this.snapshot = {
      queryResults: [],
      queryGeneration: 0,
      isLoading: false,
      currentFromLanguageItem: initialFromLanguage,
    };
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish() {
    const session = this.session;
    this.snapshot = {
      ...this.snapshot,
      isLoading:
        !!session &&
        (session.phase.kind === "detecting" || [...session.requests.values()].some((request) => request.running)),
    };
    for (const listener of this.listeners) listener();
  }

  private isCurrent(session: QuerySession, request?: ServiceRequest) {
    return (
      this.session === session &&
      !session.controller.signal.aborted &&
      (!request || (request.running && session.requests.get(request.serviceId) === request))
    );
  }

  private begin() {
    this.dispose();
    const session: QuerySession = {
      controller: new AbortController(),
      phase: { kind: "detecting" },
      cacheGeneration: getQueryCacheGeneration(),
      requests: new Map(),
      audioPlayed: false,
    };
    this.session = session;
    this.snapshot = { ...this.snapshot, queryResults: [], queryGeneration: this.snapshot.queryGeneration + 1 };
    this.publish();
    return session;
  }

  dispose = () => {
    this.session?.controller.abort();
    for (const request of this.session?.requests.values() ?? []) request.controller.abort();
  };

  clearQueryResult = () => {
    this.dispose();
    this.session = undefined;
    this.snapshot = { ...this.snapshot, queryResults: [], queryGeneration: this.snapshot.queryGeneration + 1 };
    this.publish();
  };

  queryTextWithTextInfo = (input: QueryInput, options?: QueryOptions) => {
    const session = this.begin();
    try {
      const query = {
        ...input,
        fromLanguage: getLanguageItem(input.fromLanguage).youdaoLangCode,
        toLanguage: getLanguageItem(input.toLanguage).youdaoLangCode,
      };
      session.phase = { kind: "ready", input: query };
      this.runAll(session, query, options?.bypassCache === true);
    } catch (error) {
      this.failQuery(session, error);
    }
  };

  queryText = (text: string, toLanguage: string, options?: QueryOptions) => {
    const session = this.begin();
    const bypassCache = options?.bypassCache === true;
    void this.detect(session, text, toLanguage, bypassCache);
  };

  private async detect(session: QuerySession, text: string, toLanguage: string, bypassCache: boolean) {
    try {
      const cached = bypassCache ? undefined : getCachedLanguageDetection(text);
      const detection = cached ?? (await detectLanguage(text, session.controller.signal));
      if (!this.isCurrent(session)) return;
      if (!cached) cacheLanguageDetection(text, detection, session.cacheGeneration);
      const fromLanguage = detection.language;
      const selectedTarget = getLanguageItem(toLanguage);
      const target =
        fromLanguage === selectedTarget.youdaoLangCode
          ? getAutoSelectedTargetLanguageItem(fromLanguage)
          : selectedTarget;
      const input = { word: text, fromLanguage, toLanguage: target.youdaoLangCode };
      session.phase = { kind: "ready", input };
      this.snapshot = {
        ...this.snapshot,
        currentFromLanguageItem: getLanguageItem(fromLanguage),
      };
      this.runAll(session, input, bypassCache);
    } catch (error) {
      this.failQuery(session, error);
    }
  }

  private failQuery(session: QuerySession, error: unknown) {
    if (!this.isCurrent(session)) return;
    session.phase = { kind: "failed" };
    this.publish();
    this.effects.onError(error);
  }

  private runAll(session: QuerySession, input: QueryInput, bypassCache: boolean) {
    for (const service of this.services.dictionaryServices)
      void this.runDictionary(service, session, input, bypassCache);
    for (const service of this.services.translationServices)
      void this.runTranslation(service, session, input, bypassCache);
    if (session.requests.size === 0) this.publish();
  }

  setServices = (services: QueryServiceSnapshot) => {
    const previous = this.services;
    this.services = services;
    const session = this.session;
    if (session?.phase.kind !== "ready" || !this.isCurrent(session)) return;
    const { input } = session.phase;
    const previousIds = new Set(
      [...previous.dictionaryServices, ...previous.translationServices].map((service) => service.id),
    );
    for (const service of services.dictionaryServices) {
      if (!previousIds.has(service.id)) void this.runDictionary(service, session, input, false);
    }
    for (const service of services.translationServices) {
      if (!previousIds.has(service.id)) void this.runTranslation(service, session, input, false);
    }
  };

  regenerateService = (serviceId: string) => {
    const session = this.session;
    if (session?.phase.kind !== "ready" || !this.isCurrent(session)) return;
    const { input } = session.phase;
    const cacheGeneration = getQueryCacheGeneration();
    const dictionary = this.services.dictionaryServices.find((service) => service.id === serviceId);
    if (dictionary) {
      void this.runDictionary(dictionary, session, input, true, cacheGeneration);
      return;
    }
    const translation = this.services.translationServices.find((service) => service.id === serviceId);
    if (translation) void this.runTranslation(translation, session, input, true, cacheGeneration);
  };

  private beginRequest(serviceId: string, session: QuerySession) {
    const previous = session.requests.get(serviceId);
    previous?.controller.abort();
    const controller = new AbortController();
    const request = {
      serviceId,
      controller,
      signal: AbortSignal.any([session.controller.signal, controller.signal]),
      running: true,
    };
    session.requests.set(serviceId, request);
    this.publish();
    return request;
  }

  private accept(session: QuerySession, request: ServiceRequest, result: QueryResult): boolean {
    if (!this.isCurrent(session, request)) return false;
    const results = this.snapshot.queryResults.filter((entry) => entry.serviceId !== result.serviceId);
    // An updated service follows its equal-ranked peers, preserving arrival/regeneration order.
    const index = results.findIndex((entry) => entry.serviceOrder > result.serviceOrder);
    results.splice(index < 0 ? results.length : index, 0, result);
    this.snapshot = { ...this.snapshot, queryResults: results };
    return true;
  }

  private finish(session: QuerySession, service: RuntimeServiceConfig, request: ServiceRequest, error?: unknown) {
    if (!this.isCurrent(session, request)) return;
    request.running = false;
    this.publish();
    if (error !== undefined)
      this.effects.onError(
        error instanceof RequestError ? new RequestError(service.label, error.message, error.code) : error,
      );
  }

  private async runTranslation(
    service: TranslationServiceConfig,
    session: QuerySession,
    input: QueryInput,
    bypassCache: boolean,
    cacheGeneration = session.cacheGeneration,
  ) {
    if (!service.enabled(input)) return;
    const request = this.beginRequest(service.id, session);
    if (!this.isCurrent(session, request)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let text = "";
    const accept = (result: TranslationResult, fromCache = false) => {
      if (!result.content.paragraphs.join(", ").trim()) return false;
      return this.accept(session, request, {
        ...result,
        ...serviceMetadata(service),
        ...(fromCache ? { fromCache } : {}),
      });
    };
    try {
      const cached = bypassCache ? undefined : getCachedQueryResult(service, input);
      if (cached?.content.kind === "translation" && cached.type === service.type) {
        accept({ type: service.type, content: cached.content }, true);
      } else {
        const iterator = service.createProvider().request(input, { signal: request.signal });
        while (true) {
          const { done, value } = await iterator.next();
          if (!this.isCurrent(session, request)) {
            if (!done) await iterator.throw(new CancelledError());
            return;
          }
          if (done) {
            clearTimeout(timer);
            if (value && accept(value)) cacheQueryResult(service, input, value, cacheGeneration);
            break;
          }
          text += value.content;
          if (!timer)
            timer = setTimeout(() => {
              timer = undefined;
              if (accept({ type: service.type, content: { kind: "translation", query: input, paragraphs: [text] } }))
                this.publish();
            }, 80);
        }
      }
      this.finish(session, service, request);
    } catch (error) {
      this.finish(session, service, request, error);
    } finally {
      clearTimeout(timer);
    }
  }

  private async runDictionary(
    service: DictionaryServiceConfig,
    session: QuerySession,
    input: QueryInput,
    bypassCache: boolean,
    cacheGeneration = session.cacheGeneration,
  ) {
    if (!service.enabled(input)) return;
    const request = this.beginRequest(service.id, session);
    if (!this.isCurrent(session, request)) return;
    try {
      const cached = bypassCache ? undefined : getCachedQueryResult(service, input);
      const fromCache = cached?.content.kind === "dictionary" && cached.type === service.type;
      const result =
        cached?.content.kind === "dictionary" && cached.type === service.type
          ? { type: service.type, content: cached.content }
          : await service.createProvider().request(input, { signal: request.signal });
      if (!this.isCurrent(session, request)) return;
      if (result.content.sections.length) {
        if (!fromCache) cacheQueryResult(service, input, result, cacheGeneration);
        if (!this.accept(session, request, { ...result, ...serviceMetadata(service), fromCache })) return;
        const word = result.content.query;
        if (
          myPreferences.enableAutomaticPlayWordAudio &&
          service.canTriggerAutomaticAudio &&
          word.isWord &&
          word.fromLanguage === englishLanguageItem.youdaoLangCode &&
          !session.audioPlayed
        ) {
          session.audioPlayed = true;
          this.effects.onAudio(word, request.signal);
        }
      }
      this.finish(session, service, request);
    } catch (error) {
      this.finish(session, service, request, error);
    }
  }
}
