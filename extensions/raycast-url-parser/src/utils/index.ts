export interface IURL {
  protocol: string;
  host: string;
  port: string;
  pathname: string;
  searchArr: Array<any>;
  search: string;
  hash: string;
  username: string;
  password: string;
}

export const urlParser = (url: string): IURL => {
  const _url = new URL(url);
  const search: Array<any> = Array.from(_url.searchParams.entries());

  return {
    protocol: _url.protocol,
    host: _url.host,
    port: _url.port,
    pathname: _url.pathname,
    searchArr: search,
    search: decodeURI(_url.search),
    hash: _url.hash,
    username: _url.username,
    password: _url.password,
  };
};

export const isValidUrl = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch (err) {
    return false;
  }
};

export const _decodeURI = (str: string) => {
  let res = str;
  try {
    res = decodeURI(str);
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return res;
};
