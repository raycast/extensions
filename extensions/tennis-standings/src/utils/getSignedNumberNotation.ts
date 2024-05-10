export const getSignedNumberNotationInString = (number: number): string => {
  if (number === null) {
    return "0";
  }
  if (number > 0) {
    return `+${number}`;
  } else {
    return number.toString();
  }
};
