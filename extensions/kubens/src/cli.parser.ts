export const commandOutputToArray = (output: string) => {
  const array = output.split("\n").filter(Boolean);

  return array;
};
