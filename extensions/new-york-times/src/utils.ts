export const prettifyDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const firstCharToUpperCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
