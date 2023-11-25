export const formatDate = (date: number) =>
  new Date(date * 1000).toLocaleString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
