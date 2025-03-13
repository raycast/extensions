export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  if (diff < 0) {
    // Future date
    const futureDiff = Math.abs(diff);

    if (futureDiff < MS_PER_DAY) {
      return `Tomorrow, ${date.toLocaleTimeString()}`;
    } else if (futureDiff < 2 * MS_PER_DAY) {
      return `Day after tomorrow, ${date.toLocaleTimeString()}`;
    } else {
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  } else if (diff < MS_PER_DAY) {
    return `Today, ${date.toLocaleTimeString()}`;
  } else if (diff < 2 * MS_PER_DAY) {
    return `Yesterday, ${date.toLocaleTimeString()}`;
  } else {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
};
