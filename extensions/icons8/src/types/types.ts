export interface Preferences {
  apiKey: string; 
  gridSize: string; 
  numResults: number;
}

export interface Icon8 {
  id: string; 
  name: string; 
  url: string; 
  link: string; 
  color: boolean; 
  svg: string; 
  mdImage?: string; 
  description?: string; 
  style?: string; 
  category?: string; 
  tags?: string[]; 
  isFree?: boolean; 
  isAnimated?: boolean; 
  published?: Date; 
}

export interface Style {
  code: string; 
  title: string; 
  count: number; 
  url: string; 
}