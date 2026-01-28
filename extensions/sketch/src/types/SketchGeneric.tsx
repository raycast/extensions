export interface SketchAuthErrorBody {
  code: number;
  errors?: null[] | null;
  message: string;
  status: string;
  type: string;
}

export interface SketchErrorBody {
  data?: null;
  errors?: ErrorsEntity[] | null;
}
export interface ErrorsEntity {
  code: number;
  extensions: Extensions;
  locations?: LocationsEntity[] | null;
  message: string;
  path?: string[] | null;
}
export interface Extensions {
  code: string;
  context?: null[] | null;
  reason: string;
  stripe_error_code?: null;
}
export interface LocationsEntity {
  column: number;
  line: number;
}
