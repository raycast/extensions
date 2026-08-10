import { getPreferenceValues } from '@raycast/api';

export const ALGOLIA_APP_ID = '4RTNPM1QF9';
export const ALGOLIA_PUBLIC_API_KEY = '260466eb2466a36278b2fdbcc56ad7ba';
export const ALGOLIA_INDEX_NAME = 'docs-manual';
export const { token: API_TOKEN } = getPreferenceValues<Preferences>();

export const DNS_RECORD_TYPES = {
  A: 'IPv4 address, like 192.0.1.1',
  AAAA: 'IPv6 address, like 2001:cdba:0:0:0:0:3257:9652',
  ALIAS: 'A domain name, like myapp.herokuapp.com',
  CAA: 'The value associated with the tag, like letsencrypt.org',
  CNAME: 'A domain name, like ftp.example.com',
  MX: "The mail server's hostname, like mail.example.com",
  NS: "The name server's hostname, like ns1.example.com",
  SPF: 'Text that represents the authorized mail server, like v=spf1 a mx ip4:69.64.153.131 include:_spf.google.com ~all',
  SRV: '',
  TXT: 'Free form text data',
};

export const APP_URL = 'https://app.netlify.com';
