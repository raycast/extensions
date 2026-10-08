export const base64ShellSanitize = (str: string): string => {
  const base64str = Buffer.from(str).toString("base64");
  return `$(echo ${base64str} | base64 -d)`;
};
