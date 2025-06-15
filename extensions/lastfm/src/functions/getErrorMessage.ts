export const getErrorMessage = (errorNumber: number): string => {
  switch (errorNumber) {
    case 6:
      return "User not found.";
    case 10:
      return "Invalid API key.";
    case 29:
      return "Rate limit exceeded. Please wait a while.";
    default:
      return "Unknown error.";
  }
};

export default getErrorMessage;
