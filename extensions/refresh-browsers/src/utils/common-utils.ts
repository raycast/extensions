export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const isNotEmpty = (string: string | null | undefined) => {
  return !isEmpty(string);
};
