export const constructDetailsMarkdown = () => {
  return `
  # Prototype Preview\n
  
  `;
};

export const formatDateForList = (date: Date) => {
  if (!(date instanceof Date)) date = new Date(date);
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // If the date is 1 year or more older than current date, format as mm/yy
  if (date < oneYearAgo) {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
  }

  // Otherwise, use the original format
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  return `${month} ${day}`;
};
