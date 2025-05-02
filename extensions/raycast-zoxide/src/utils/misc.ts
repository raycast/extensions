export const base64ShellSanitize = (str: string): string => {
  const base64str = btoa(str);
  return `$(echo ${base64str} | base64 -d)`;
};
