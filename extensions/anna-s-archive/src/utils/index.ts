export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};
