export const isEmpty = (string: string | null | undefined) => {
  return !(typeof string !== "undefined" && string != null && String(string).length > 0);
};
