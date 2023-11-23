export interface GetIPResponse {
  body: Body;
  success: boolean;
}
export interface Body {
  ip: string;
  type: string;
  org: string;
  country: string;
  handler: string;
  pop: string;
}
