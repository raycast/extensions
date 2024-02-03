export function getRating(rating?: number) {
  const STAR = "⭐";
  return rating ? `${rating.toFixed(2)} ${STAR.repeat(Math.round(rating / 2))}` : "Not Rated";
}

export function formatMovieDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const hoursString = `${hours}`;
  const minutesString = remainingMinutes < 10 ? `0${remainingMinutes}` : `${remainingMinutes}`;

  if (remainingMinutes === 0) {
    return `${hoursString}h`;
  } else {
    return `${hoursString}h${minutesString}`;
  }
}
