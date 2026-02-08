export interface Transformation {
  id: string;
  name: string;
  description: string;
  icon: string;
  transform: (text: string) => string;
  preferenceKey: string;
}
