export const getDate = (date: Date | undefined): string => {
  if (!date) return "";
  const dateObj = new Date(date);
  return dateObj.toLocaleDateString();
};
