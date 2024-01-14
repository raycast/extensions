// Checks if string argument is a valid integer
const isValidInteger = (number: string) => {
  const intValue = parseInt(number, 10);
  return !isNaN(intValue) && intValue == parseFloat(number) && intValue > 0;
};

const validateArguments = (width: string, height: string = "") => {
  // Check width
  if (!isValidInteger(width)) {
    return false;
  }

  // Check height
  if (height !== "" && !isValidInteger(height)) {
    return false;
  }

  return true;
};

export { validateArguments };
