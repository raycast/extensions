export const formatDuration = (duration: number) => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  return `${hours > 0 ? `${zeropad(hours)}:` : ""}${zeropad(minutes)}:${zeropad(seconds)}`;
};

const zeropad = (num: number): string => {
  return num.toString().padStart(2, "0");
};
