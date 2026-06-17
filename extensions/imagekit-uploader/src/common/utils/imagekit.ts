export const getDetailImage = (origin: string, height: number) => {
  const url = new URL(origin);
  const [appId, ...rest] = url.pathname.split('/').slice(1);
  url.pathname = '/' + [appId, `tr:h-${height},f-auto`, ...rest].join('/');
  const optimizedUrl = url.toString();
  return optimizedUrl;
};
