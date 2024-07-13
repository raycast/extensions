export interface Exercise {
  id: string;
  name: string;
  force?: string;
  level: string;
  mechanic?: string;
  equipment?: string;
  primaryMuscles: string;
  secondaryMuscles?: string[];
  instructions: string[];
  category: string;
  images: string[];
  subtitle: string;
  new_instructions: string;
  tip: string;
  short_description: string;
  tags: string[];
}
