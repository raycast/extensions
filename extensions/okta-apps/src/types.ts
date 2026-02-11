export interface OktaAppLink {
  id: string;
  label: string;
  linkUrl: string;
  logoUrl: string;
  appName: string;
}

export interface OktaUserAppListResponse {
  obj: OktaAppLink[];
}
