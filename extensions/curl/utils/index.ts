interface HeaderKey {
  [key: string]: string | number;
}

interface Header extends HeaderKey {
  key: string;
  value: string;
}

export const methods: string[] = ["GET", "POST", "PUT", "DELETE"];

export const headerKeys: string[] = [
  "A-IM",
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Accept-Datetime",
  "Access-Control-Request-Method",
  "Access-Control-Request-Headers",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Date",
  "Expect",
  "Forwarded",
  "From",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
  "If-Range",
  "If-Unmodified-Since",
  "Max-Forwards",
  "Origin",
  "Pragma",
  "Proxy-Authorization",
  "Range",
  "Referer",
  "TE",
  "User-Agent",
  "Upgrade",
  "Via",
  "Warning",
  "Dnt",
  "X-Requested-With",
  "X-CSRF-Token",
];

export function makeObject(array: Header[]) {
  return array.reduce((obj: object, item: Header) => Object.assign(obj, { [item.key]: item.value }), {});
}
