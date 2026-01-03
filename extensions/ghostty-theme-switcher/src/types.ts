export interface ThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  palette: string[];
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}
