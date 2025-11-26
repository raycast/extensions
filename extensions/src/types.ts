// Tipos para a API LanguageTool
// Baseado no Swagger 2.0 oficial

export interface Language {
  /** Nome do idioma como 'French' ou 'English (Australia)' */
  name: string;
  /** Código do idioma como 'en' */
  code: string;
  /** Código completo do idioma como 'en-US' ou 'ca-ES-valencia' */
  longCode: string;
}

export interface CheckTextResponse {
  software?: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    status?: string;
    premium?: boolean;
  };
  language?: {
    name: string;
    code: string;
    detectedLanguage: {
      name: string;
      code: string;
    };
  };
  matches?: Match[];
}

export interface Match {
  /** Mensagem sobre o erro exibida ao usuário */
  message: string;
  /** Versão mais curta opcional da mensagem */
  shortMessage?: string;
  /** Offset baseado em 0 do erro no texto */
  offset: number;
  /** Comprimento do erro em caracteres */
  length: number;
  /** Substituições que podem corrigir o erro */
  replacements: Replacement[];
  /** Contexto do erro */
  context: {
    text: string;
    offset: number;
    length: number;
  };
  /** A sentença onde o erro ocorreu */
  sentence: string;
  rule?: {
    id: string;
    subId?: string;
    description: string;
    urls?: Array<{ value?: string }>;
    issueType?: string;
    category: {
      id?: string;
      name?: string;
    };
  };
}

export interface Replacement {
  value?: string;
}
