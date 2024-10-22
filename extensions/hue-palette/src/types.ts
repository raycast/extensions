export interface TailwindColors {
  [key: string]: string;
}

export interface Hue {
  name: string;
  colors: string[];
  tailwind_colors_name: string;
  tailwind_colors: TailwindColors;
  background: string;
  text: string;
}
