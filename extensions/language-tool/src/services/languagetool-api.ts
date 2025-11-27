import { getPreferenceValues } from "@raycast/api";
import { API_ENDPOINTS } from "../config/api";
import type { CheckTextResponse } from "../types";
import { isEmpty } from "../utils/string-utils";

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
  enableHiddenRules?: boolean;
  noopLanguages?: string;
  abtest?: string;
  mode?: "" | "allButTextLevelOnly" | "textLevelOnly";
  allowIncompleteResults?: boolean;
  useragent?: string;
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
  /** Se true, habilita regras ocultas na API */
  enableHiddenRules?: boolean;
  /** Idiomas que não devem ser processados (separados por vírgula) */
  noopLanguages?: string;
  /** Configuração de testes A/B para recursos experimentais */
  abtest?: string;
  /** Modo da API: '', 'allButTextLevelOnly' ou 'textLevelOnly' */
  mode?: "" | "allButTextLevelOnly" | "textLevelOnly";
  /** Se true, permite resultados incompletos */
  allowIncompleteResults?: boolean;
  /** User agent para requisições da API */
  useragent?: string;
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
  if (options.text && !isEmpty(options.text)) {
    params.text = options.text;
  }
  else if (options.data) {
    params.data = options.data;
  }

  // Adiciona credenciais Premium se existirem
  if (preferences.username && preferences.apiKey) {
    params.username = preferences.username;
    params.apiKey = preferences.apiKey;
  }

  // Adiciona todas as opções avançadas se fornecidas
  if (options.dicts && !isEmpty(options.dicts)) {
    params.dicts = options.dicts;
  }
  if (options.motherTongue && !isEmpty(options.motherTongue)) {
    params.motherTongue = options.motherTongue;
  }
  if (options.preferredVariants && !isEmpty(options.preferredVariants)) {
    params.preferredVariants = options.preferredVariants;
  }
  if (options.enabledRules && !isEmpty(options.enabledRules)) {
    params.enabledRules = options.enabledRules;
  }
  if (options.disabledRules && !isEmpty(options.disabledRules)) {
    params.disabledRules = options.disabledRules;
  }
  if (options.enabledCategories && !isEmpty(options.enabledCategories)) {
    params.enabledCategories = options.enabledCategories;
  }
  if (options.disabledCategories && !isEmpty(options.disabledCategories)) {
    params.disabledCategories = options.disabledCategories;
  }
  if (options.enabledOnly !== undefined) {
    params.enabledOnly = String(options.enabledOnly);
  }
  if (options.level && !isEmpty(options.level)) {
    params.level = options.level;
  }
  if (options.enableHiddenRules !== undefined) {
    params.enableHiddenRules = String(options.enableHiddenRules);
  }
  if (options.noopLanguages && !isEmpty(options.noopLanguages)) {
    params.noopLanguages = options.noopLanguages;
  }
  if (options.abtest && !isEmpty(options.abtest)) {
    params.abtest = options.abtest;
  }
  if (options.mode && !isEmpty(options.mode)) {
    params.mode = options.mode;
  }
  if (options.allowIncompleteResults !== undefined) {
    params.allowIncompleteResults = String(options.allowIncompleteResults);
  }
  if (options.useragent && !isEmpty(options.useragent)) {
    params.useragent = options.useragent;
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
