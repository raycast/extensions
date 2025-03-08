/**
 * Interface que representa uma nota do Anki
 */
export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: { [key: string]: string };
  tags?: string[];
  options?: {
    allowDuplicate?: boolean;
    duplicateScope?: string;
    duplicateScopeOptions?: {
      deckName?: string;
      checkChildren?: boolean;
      checkAllModels?: boolean;
    };
  };
  audio?: Array<{
    url?: string;
    path?: string;
    filename: string;
    fields: string[];
    skipHash?: string;
  }>;
  video?: Array<{
    url?: string;
    path?: string;
    filename: string;
    fields: string[];
    skipHash?: string;
  }>;
  picture?: Array<{
    url?: string;
    path?: string;
    filename: string;
    fields: string[];
    skipHash?: string;
  }>;
}

/**
 * Interface que representa a resposta da API AnkiConnect
 */
export interface AnkiResponse<T = unknown> {
  result: T | null;
  error: string | null;
}

/**
 * Interface para o objeto de requisição do AnkiConnect
 */
export interface AnkiRequest {
  action: string;
  version: number;
  params: Record<string, unknown>;
}
