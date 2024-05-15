export {};

declare global {
  export interface OtpConfig {
    website: string
    account: string
    secret: string
    code: string
    uri: string
  }
  
  export interface Preps {
    authFile: string
  }
};