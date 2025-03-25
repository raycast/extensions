const formatDate = (date: Date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "numeric",
  });
};
export default formatDate;
