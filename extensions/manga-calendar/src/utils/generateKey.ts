export const generateKey = (pre: string) => {
  return `${pre}_${new Date().getTime()}`;
};
