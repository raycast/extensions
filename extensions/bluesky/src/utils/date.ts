export const getReadableDate = (date: string) => {
  const indexedAt = new Date(date);
  const now = new Date();
  const diffInMs = now.getTime() - indexedAt.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60); // convert milliseconds to hours

  const formattedDate = diffInHours > 24 ? getFormattedDateTime(date) : getRelativeDateTime(date);

  return formattedDate;
};

export const getFormattedDateTime = (date: string) => {
  const postDate = new Date(date);

  const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedDate = dateTimeFormat.format(postDate);

  return formattedDate;
};

export const getRelativeDateTime = (date: string) => {
  const indexedAt = new Date(date);
  const now = new Date();

  const secondsDifference = Math.floor((now.getTime() - indexedAt.getTime()) / 1000);
  const minutesDifference = Math.floor(secondsDifference / 60);
  const hoursDifference = Math.floor(minutesDifference / 60);
  const daysDifference = Math.floor(hoursDifference / 24);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  let relativeTime = "";

  if (daysDifference > 0) {
    relativeTime = rtf.format(-daysDifference, "day");
  } else if (hoursDifference > 0) {
    relativeTime = rtf.format(-hoursDifference, "hour");
  } else if (minutesDifference > 0) {
    relativeTime = rtf.format(-minutesDifference, "minute");
  } else {
    relativeTime = rtf.format(-secondsDifference, "second");
  }

  return relativeTime;
};
