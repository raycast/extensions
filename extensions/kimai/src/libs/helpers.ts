export const padWithLeadingZeros = (num: number) => {
  return String(num).padStart(2, "0");
};

export const convertToHours = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${padWithLeadingZeros(hours)}:${padWithLeadingZeros(minutes)}`;
};
