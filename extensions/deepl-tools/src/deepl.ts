type DeepLResponse = {
  translations?: Array<{
    detected_source_language?: string;
    text: string;
  }>;
  message?: string;
  error?: {
    message?: string;
  };
};

export function chooseDirection(text: string) {
  const cyrillicCount = [...text.matchAll(/[А-Яа-яЁё]/g)].length;
  const total = text.replace(/\s/g, "").length;

  if (total === 0) {
    return { sourceLang: undefined, targetLang: "RU" as const, rule: "empty -> auto -> RU" };
  }

  if (cyrillicCount * 2 > total) {
    return { sourceLang: "RU", targetLang: "EN" as const, rule: ">50% Cyrillic -> RU -> EN" };
  }

  return { sourceLang: undefined, targetLang: "RU" as const, rule: "<=50% Cyrillic -> auto -> RU" };
}

export async function translate(text: string, preferences: Preferences) {
  const direction = chooseDirection(text);
  const body = new URLSearchParams();
  body.set("text", text);
  body.set("target_lang", direction.targetLang);
  if (direction.sourceLang) {
    body.set("source_lang", direction.sourceLang);
  }

  const response = await fetch(preferences.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${preferences.apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as DeepLResponse;

  if (!response.ok) {
    throw new Error(payload.message || payload.error?.message || `DeepL API error ${response.status}`);
  }

  const translatedText = payload.translations?.[0]?.text;
  if (!translatedText) {
    throw new Error("DeepL response did not contain a translation");
  }

  return {
    ...direction,
    translatedText,
    sourceLang: payload.translations?.[0]?.detected_source_language || direction.sourceLang,
  };
}
