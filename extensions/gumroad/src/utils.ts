export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString(undefined, options);
};

export const formatNumber = (number: string): string => {
  return Number(number).toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export const removeParentheses = (str: string): string => {
  return str.replace(/[()]/g, "");
};

export const removeProtocol = (url: string): string => {
  return url.replace(/(^\w+:|^)\/\//, "");
};
