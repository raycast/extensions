export type GradType = 'linear' | 'radial' | 'conic';

export type Gradient = {
  type: GradType;
  angle?: number;
  stops: string[];
  label?: string;
};
