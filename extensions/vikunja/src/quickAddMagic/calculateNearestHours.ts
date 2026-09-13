export function calculateNearestHours(currentDate: Date = new Date()): number {
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();

  const isBeforeOrAt = (breakpoint: number): boolean => {
    return hours < breakpoint || (hours === breakpoint && minutes === 0);
  };

  if (isBeforeOrAt(9) || hours > 21) {
    return 9;
  }

  if (isBeforeOrAt(12)) {
    return 12;
  }

  if (isBeforeOrAt(15)) {
    return 15;
  }

  if (isBeforeOrAt(18)) {
    return 18;
  }

  if (isBeforeOrAt(21)) {
    return 21;
  }

  return 9;
}
