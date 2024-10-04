export interface IngredientsCheckResponse {
  code: string;
  status: string;
  message: string;
  data: { vegan: boolean };
}
