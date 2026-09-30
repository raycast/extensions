export const isValidQuestionPrompt = (prompt: string) => {
  if (prompt.trim() === "") {
    return false;
  } else {
    return true;
  }
};
