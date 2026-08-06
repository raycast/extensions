export type TagLike =
  | string
  | {
      nome?: string;
      name?: string;
      value?: string;
      titulo?: string;
      title?: string;
      toString?: () => string;
    };

export type AuthorLike =
  | string
  | { nome?: string; name?: string; [key: string]: unknown }
  | undefined
  | null;

export interface Article {
  id: number;
  titulo: string;
  url: string;
  /**
   * Always null from this API. Verified 2026-08-06 across a 5-article sample
   * and a full field dump: texto, lead and body are null and charCount is 0,
   * while the same response reports a real wordCount. The content is withheld
   * deliberately. Kept to document the payload shape; see context.md backlog
   * item 2 before trying to use them.
   */
  texto?: string;
  descricao?: string;
  lead?: string;
  body?: string;
  secao?: string;
  time?: string;
  data?: string;
  imagem?: {
    src: string;
    titulo?: string;
    credito?: string;
  };
  multimediaPrincipal?:
    | string
    | {
        src: string;
        titulo?: string;
        credito?: string;
        tipo?: string;
      };
  autores?:
    | Array<{
        nome: string;
        name?: string;
        cargo?: string;
        email?: string;
        imagem?: {
          url: string;
        };
      }>
    | {
        nome: string;
        name?: string;
        cargo?: string;
        email?: string;
        imagem?: {
          url: string;
        };
      };
  tags?: TagLike | TagLike[];
  fullUrl?: string;
}
