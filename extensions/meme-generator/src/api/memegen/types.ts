// Memegen API response types
export interface MemegenTemplate {
  id: string;
  name: string;
  lines: number;
  overlays: number;
  styles: string[];
  blank: string;
  example: {
    text: string[];
    url: string;
  };
  source: string;
  keywords: string[];
  _self: string;
}

export type MemegenTemplatesResponse = MemegenTemplate[];
