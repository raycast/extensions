export interface IngredientsCheckResponse {
  code: string;
  status: string;
  message: string;
  data: {
    vegan: boolean;
    surely_vegan: string[];
    not_vegan: string[];
    maybe_not_vegan: string[];
    unknown: string[];
  };
}
