export const allSameCharacters = (string_: string) => {
  for (let i = 1; i < string_.length; i++) {
    if (string_[i] !== string_[0]) return false;
  }
  return true;
};
