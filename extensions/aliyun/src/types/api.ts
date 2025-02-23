export interface APIProduct {
  name: string;
  code: string;
  version: string;
  description?: string;
}

export interface APIOperation {
  name: string;
  description: string;
  product: string;
  productName: string;
  version: string;
  apiPath: string;
  summary: string;
}
