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

export interface Article {
  id: number;
  titulo: string;
  url: string;
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
