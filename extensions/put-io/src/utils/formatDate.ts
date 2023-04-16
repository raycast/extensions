const formatDate = (date: Date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return "(not a date)";
  }
  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default formatDate;
