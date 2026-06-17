export interface IconInfo {
  id: number;
  title: string;
  name: string;
  category: string;
  categoryCN: string;
  author: string;
  tag: string[];
  rtl: boolean;
  svgCode?: string;
}

export interface IconConfig {
  theme: string;
  size: string;
  strokeWidth: number;
  strokeLinecap: string;
  strokeLinejoin: string;
  color?: ColorConfig;
}

export interface ColorConfig {
  outline: {
    fill: string;
    background: string;
  };
  filled: {
    fill: string;
    background: string;
  };
  twoTone: {
    fill: string;
    twoTone: string;
  };
  multiColor: {
    outStrokeColor: string;
    outFillColor: string;
    innerStrokeColor: string;
    innerFillColor: string;
  };
}
