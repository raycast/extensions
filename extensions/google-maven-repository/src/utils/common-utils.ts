export const isEmpty = (string: number | string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};
