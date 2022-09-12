export type Color = {
  id: string;
  name: string;
  value:
    | {
        a: number;
        r: number;
        g: number;
        b: number;
      }
    | string;
};

export type Bitmap = {
  id: string;
  name: string;
  value: {
    url: string;
    format: 'jpg' | 'png';
    dimension?: number;
  };
};

export type Vector = {
  id: string;
  name: string;
  value: {
    url: string;
    format: 'svg' | 'pdf';
  };
  sourceFile?: string;
};
