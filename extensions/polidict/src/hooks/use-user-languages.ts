import { LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createApiClient } from "../api";
import type { SupportedLanguage } from "../types";
import { queryKeys, readSharedCache, removeSharedCache, writeSharedCache } from "../features/shared/query-keys";

const CURRENT_LANGUAGE_KEY_PREFIX = "currentLanguage";
const LEGACY_CURRENT_LANGUAGE_KEY = "currentLanguage";

function getCurrentLanguageKey(authIdentity: string): string {
  return `${CURRENT_LANGUAGE_KEY_PREFIX}:${authIdentity}`;
}

export function useUserLanguages(authIdentity: string) {
  const client = createApiClient();
  const currentLanguageKey = getCurrentLanguageKey(authIdentity);
  const [languageListRevision, setLanguageListRevision] = useState(() =>
    queryKeys.languages.listRevision(authIdentity),
  );
  const [nativeLanguageRevision, setNativeLanguageRevision] = useState(() =>
    queryKeys.languages.nativeRevision(authIdentity),
  );
  const [currentLanguageRevision, setCurrentLanguageRevision] = useState(() =>
    queryKeys.languages.currentRevision(authIdentity),
  );

  useEffect(() => {
    setLanguageListRevision(queryKeys.languages.listRevision(authIdentity));
    return queryKeys.languages.subscribeListRevision(authIdentity, setLanguageListRevision);
  }, [authIdentity]);

  useEffect(() => {
    setNativeLanguageRevision(queryKeys.languages.nativeRevision(authIdentity));
    return queryKeys.languages.subscribeNativeRevision(authIdentity, setNativeLanguageRevision);
  }, [authIdentity]);

  useEffect(() => {
    setCurrentLanguageRevision(queryKeys.languages.currentRevision(authIdentity));
    return queryKeys.languages.subscribeCurrentRevision(authIdentity, setCurrentLanguageRevision);
  }, [authIdentity]);

  const languageListCacheKey = queryKeys.languages.list(authIdentity, languageListRevision);
  const nativeLanguageCacheKey = queryKeys.languages.native(authIdentity, nativeLanguageRevision);
  const currentLanguageCacheKey = queryKeys.languages.current(authIdentity, currentLanguageRevision);

  const {
    data: languages,
    isLoading: isLoadingLanguages,
    revalidate: revalidateLanguagesRaw,
    mutate: mutateLanguages,
  } = useCachedPromise(
    async (authIdentityForRequest: string, revisionToken: string) => {
      void authIdentityForRequest;
      const cacheKey = queryKeys.languages.list(authIdentityForRequest, revisionToken);
      const result = await client.languages.getUserLanguages();
      writeSharedCache(cacheKey, result);
      return result;
    },
    [authIdentity, languageListRevision],
    {
      initialData: readSharedCache<SupportedLanguage[]>(languageListCacheKey),
      keepPreviousData: false,
    },
  );

  const {
    data: nativeLanguage,
    isLoading: isLoadingNative,
    revalidate: revalidateNativeRaw,
    mutate: mutateNativeLanguage,
  } = useCachedPromise(
    async (authIdentityForRequest: string, revisionToken: string) => {
      void authIdentityForRequest;
      const cacheKey = queryKeys.languages.native(authIdentityForRequest, revisionToken);
      const result = await client.languages.getNativeLanguage();
      writeSharedCache(cacheKey, result);
      return result;
    },
    [authIdentity, nativeLanguageRevision],
    {
      initialData: readSharedCache<SupportedLanguage | null>(nativeLanguageCacheKey),
      keepPreviousData: false,
    },
  );

  const {
    data: currentLanguageCode,
    revalidate: revalidateCurrentLanguageRaw,
    mutate: mutateCurrentLanguageCode,
  } = useCachedPromise(
    async (storageKey: string, revisionToken: string) => {
      const cacheKey = queryKeys.languages.current(authIdentity, revisionToken);
      const stored = await LocalStorage.getItem<string>(storageKey);
      if (stored) {
        writeSharedCache(cacheKey, stored);
        return stored;
      }

      const legacyStored = await LocalStorage.getItem<string>(LEGACY_CURRENT_LANGUAGE_KEY);
      if (legacyStored) {
        writeSharedCache(cacheKey, legacyStored);
        return legacyStored;
      }

      removeSharedCache(cacheKey);
      return legacyStored ?? null;
    },
    [currentLanguageKey, currentLanguageRevision],
    {
      initialData: readSharedCache<string | null>(currentLanguageCacheKey),
      keepPreviousData: false,
    },
  );

  const currentLanguage: SupportedLanguage | undefined =
    languages?.find((l) => l.languageCode === currentLanguageCode) ?? languages?.[0];

  async function setCurrentLanguage(language: SupportedLanguage) {
    await LocalStorage.setItem(currentLanguageKey, language.languageCode);
    const nextRevision = queryKeys.languages.bumpCurrentRevision(authIdentity);
    writeSharedCache(queryKeys.languages.current(authIdentity, nextRevision), language.languageCode);
    await mutateCurrentLanguageCode(Promise.resolve(language.languageCode), {
      optimisticUpdate: () => language.languageCode,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });
  }

  async function addLanguage(languageCode: string) {
    const updatedLanguages = await client.languages.addLanguage(languageCode);
    const nextRevision = queryKeys.languages.bumpListRevision(authIdentity);
    writeSharedCache(queryKeys.languages.list(authIdentity, nextRevision), updatedLanguages);
    await mutateLanguages(Promise.resolve(updatedLanguages), {
      optimisticUpdate: () => updatedLanguages,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });
  }

  async function removeLanguage(languageCode: string) {
    const updatedLanguages = await client.languages.removeLanguage(languageCode);
    const storedCurrentLanguage =
      (await LocalStorage.getItem<string>(currentLanguageKey)) ??
      (await LocalStorage.getItem<string>(LEGACY_CURRENT_LANGUAGE_KEY));
    const hasStoredLanguage = updatedLanguages.some((language) => language.languageCode === storedCurrentLanguage);
    const fallbackLanguage = updatedLanguages[0];

    if (!hasStoredLanguage) {
      if (fallbackLanguage) {
        await LocalStorage.setItem(currentLanguageKey, fallbackLanguage.languageCode);
      } else {
        await LocalStorage.removeItem(currentLanguageKey);
      }
      await LocalStorage.removeItem(LEGACY_CURRENT_LANGUAGE_KEY);
    }

    const nextListRevision = queryKeys.languages.bumpListRevision(authIdentity);
    writeSharedCache(queryKeys.languages.list(authIdentity, nextListRevision), updatedLanguages);
    await mutateLanguages(Promise.resolve(updatedLanguages), {
      optimisticUpdate: () => updatedLanguages,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });

    if (hasStoredLanguage && storedCurrentLanguage) {
      await mutateCurrentLanguageCode(Promise.resolve(storedCurrentLanguage), {
        optimisticUpdate: () => storedCurrentLanguage,
        rollbackOnError: false,
        shouldRevalidateAfter: false,
      });
    } else if (fallbackLanguage) {
      const nextCurrentRevision = queryKeys.languages.bumpCurrentRevision(authIdentity);
      writeSharedCache(queryKeys.languages.current(authIdentity, nextCurrentRevision), fallbackLanguage.languageCode);
      await mutateCurrentLanguageCode(Promise.resolve(fallbackLanguage.languageCode), {
        optimisticUpdate: () => fallbackLanguage.languageCode,
        rollbackOnError: false,
        shouldRevalidateAfter: false,
      });
    } else {
      const nextCurrentRevision = queryKeys.languages.bumpCurrentRevision(authIdentity);
      writeSharedCache(queryKeys.languages.current(authIdentity, nextCurrentRevision), null);
      await mutateCurrentLanguageCode(Promise.resolve(null), {
        optimisticUpdate: () => null,
        rollbackOnError: false,
        shouldRevalidateAfter: false,
      });
    }
  }

  async function setNativeLanguage(languageCode: string) {
    const result = await client.languages.setNativeLanguage(languageCode);
    const nextRevision = queryKeys.languages.bumpNativeRevision(authIdentity);
    writeSharedCache(queryKeys.languages.native(authIdentity, nextRevision), result);
    await mutateNativeLanguage(Promise.resolve(result), {
      optimisticUpdate: () => result,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });
  }

  async function removeNativeLanguage() {
    await client.languages.removeNativeLanguage();
    const nextRevision = queryKeys.languages.bumpNativeRevision(authIdentity);
    writeSharedCache(queryKeys.languages.native(authIdentity, nextRevision), null);
    await mutateNativeLanguage(Promise.resolve(null), {
      optimisticUpdate: () => null,
      rollbackOnError: false,
      shouldRevalidateAfter: false,
    });
  }

  const revalidate = () => {
    const nextLanguageListRevision = queryKeys.languages.listRevision(authIdentity);
    const nextNativeLanguageRevision = queryKeys.languages.nativeRevision(authIdentity);
    const nextCurrentLanguageRevision = queryKeys.languages.currentRevision(authIdentity);

    const needsLanguageListSync = nextLanguageListRevision !== languageListRevision;
    const needsNativeLanguageSync = nextNativeLanguageRevision !== nativeLanguageRevision;
    const needsCurrentLanguageSync = nextCurrentLanguageRevision !== currentLanguageRevision;

    if (needsLanguageListSync || needsNativeLanguageSync || needsCurrentLanguageSync) {
      if (needsLanguageListSync) {
        setLanguageListRevision(nextLanguageListRevision);
      }
      if (needsNativeLanguageSync) {
        setNativeLanguageRevision(nextNativeLanguageRevision);
      }
      if (needsCurrentLanguageSync) {
        setCurrentLanguageRevision(nextCurrentLanguageRevision);
      }
      return;
    }

    return Promise.all([revalidateLanguagesRaw(), revalidateNativeRaw(), revalidateCurrentLanguageRaw()]);
  };

  return {
    languages: languages ?? [],
    nativeLanguage: nativeLanguage ?? undefined,
    currentLanguage,
    isLoading: isLoadingLanguages || isLoadingNative,
    hasLanguages: (languages?.length ?? 0) > 0,
    setCurrentLanguage,
    addLanguage,
    removeLanguage,
    setNativeLanguage,
    removeNativeLanguage,
    revalidate,
  };
}
