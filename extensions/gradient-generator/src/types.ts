export type GradType = 'linear' | 'radial' | 'conic';

export type Gradient = {
  type: GradType;
  angle?: number;
  stops: string[];
  label?: string;
};

export type ValidationError = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

export type GradientValidation = {
  stops: ValidationError[];
  angle: ValidationError[];
  overall: ValidationResult;
};
