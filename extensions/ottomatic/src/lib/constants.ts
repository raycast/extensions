const isDev = process.env.NODE_ENV === "development";
export const clientId = isDev ? "xONriBaQdRwxkE53" : "knPOnlv1o1yv2NQf";
export const authBaseUrl = isDev ? "https://humble-urchin-18.clerk.accounts.dev" : "https://clerk.ottomatic.cloud";
export const ottomaticBaseUrl = isDev ? "http://localhost:3060" : "https://console.ottomatic.cloud";
export const apiBaseUrl = ottomaticBaseUrl + "/api/v1";
