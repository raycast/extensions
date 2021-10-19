<<<<<<< HEAD
export interface SketchAuthErrorBody {
=======
export interface SketchErrorBody {
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5
  code: number;
  errors?: null[] | null;
  message: string;
  status: string;
  type: string;
<<<<<<< HEAD
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
=======
}
>>>>>>> 03c01420ef3b43e9aa6fbbd48100f74091d333f5
