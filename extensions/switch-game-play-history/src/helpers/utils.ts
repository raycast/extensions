export function parseUrlParams(url: string) {
  const params: {
    [key: string]: string | undefined;
  } = {};
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) {
    return params;
  }
  const queryStr = url.substring(hashIndex + 1);
  const queryArr = queryStr.split("&");
  for (let i = 0; i < queryArr.length; i++) {
    const [key, value] = queryArr[i].split("=");
    params[key] = value;
  }
  return params;
}
