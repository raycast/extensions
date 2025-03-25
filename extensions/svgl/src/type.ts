export interface Svg {
  id: number;
  title: string;
  category: string | string[];
  route:
    | string
    | {
        dark: string;
        light: string;
      };
  wordmark:
    | string
    | {
        dark: string;
        light: string;
      };
  brandUrl: string;
  url: string;
}

export interface Category {
  category: string;
  total: number;
}
