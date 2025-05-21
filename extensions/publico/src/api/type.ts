export interface Article {
  id: number;
  titulo: string;
  url: string;
  texto?: string;
  descricao?: string;
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
        cargo?: string;
        email?: string;
        imagem?: {
          url: string;
        };
      }>
    | {
        nome: string;
        cargo?: string;
        email?: string;
        imagem?: {
          url: string;
        };
      };
  tags?: string[];
}
