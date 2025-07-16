export interface ISymbol {
  symbol: string;
  coinLogo?: string;
  coinName?: string;
}

export interface CGResponse<T> {
  code: string;
  message: string;
  success: boolean;
  data: T;
}
