import { getPreferenceValues } from "@raycast/api";
import { API_ENDPOINTS } from "../config/api";
import type { CheckTextResponse } from "../types";

interface Preferences {
  username?: string;
  apiKey?: string;
  showAdvancedOptions?: boolean;
  motherTongue?: string;
  preferredVariants?: string;
  level?: "" | "default" | "picky";
  enabledRules?: string;
  disabledRules?: string;
  enabledCategories?: string;
  disabledCategories?: string;
  enabledOnly?: boolean;
}

export interface CheckTextOptions {
  /** O texto a ser verificado (obrigatório se 'data' não for fornecido) */
  text?: string;
  /** JSON com markup (alternativa a 'text') */
  data?: string;
  /** Código do idioma (ex: 'en-US', 'pt-BR', 'auto') */
  language: string;
  /** Lista separada por vírgula de dicionários a incluir */
  dicts?: string;
  /** Código do idioma nativo para verificações de falsos cognatos */
  motherTongue?: string;
  /** Variantes preferidas quando usar language=auto (ex: 'en-GB,de-AT') */
  preferredVariants?: string;
  /** IDs de regras a serem habilitadas, separadas por vírgula */
  enabledRules?: string;
  /** IDs de regras a serem desabilitadas, separadas por vírgula */
  disabledRules?: string;
  /** IDs de categorias a serem habilitadas, separadas por vírgula */
  enabledCategories?: string;
  /** IDs de categorias a serem desabilitadas, separadas por vírgula */
  disabledCategories?: string;
  /** Se true, apenas regras/categorias especificadas em enabledRules/enabledCategories são ativadas */
  enabledOnly?: boolean;
  /** Nível de verificação: '' (padrão), 'default' ou 'picky' (mais rigoroso) */
  level?: "" | "default" | "picky";
}

/**
 * Serviço centralizado para chamadas à API LanguageTool
 * Automaticamente inclui credenciais Premium se configuradas nas preferências
 */
export async function checkTextWithAPI(options: CheckTextOptions): Promise<CheckTextResponse> {
  const preferences = getPreferenceValues<Preferences>();

  // Monta os parâmetros base
  const params: Record<string, string> = {
    language: options.language,
  };

  // Texto ou data (um deles é obrigatório)
  if (options.text) {
    params.text = options.text;
  }
  if (options.data) {
    params.data = options.data;
  }

  // Adiciona credenciais Premium se existirem
  if (preferences.username && preferences.apiKey) {
    params.username = preferences.username;
    params.apiKey = preferences.apiKey;
  }

  // Adiciona todas as opções avançadas se fornecidas
  if (options.dicts) {
    params.dicts = options.dicts;
  }
  if (options.motherTongue) {
    params.motherTongue = options.motherTongue;
  }
  if (options.preferredVariants) {
    params.preferredVariants = options.preferredVariants;
  }
  if (options.enabledRules) {
    params.enabledRules = options.enabledRules;
  }
  if (options.disabledRules) {
    params.disabledRules = options.disabledRules;
  }
  if (options.enabledCategories) {
    params.enabledCategories = options.enabledCategories;
  }
  if (options.disabledCategories) {
    params.disabledCategories = options.disabledCategories;
  }
  if (options.enabledOnly !== undefined) {
    params.enabledOnly = String(options.enabledOnly);
  }
  if (options.level) {
    params.level = options.level;
  }

  const formData = new URLSearchParams(params);

  const response = await fetch(API_ENDPOINTS.CHECK, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Verifica se o usuário tem credenciais Premium configuradas
 */
export function hasPremiumAccess(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  return !!(preferences.username && preferences.apiKey);
}
