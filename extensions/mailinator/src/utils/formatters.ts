export const formatTimeAgo = (secondsAgo: number): string => {
  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`;
  }
  if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return `${minutes}m ago`;
  }
  if (secondsAgo < 86400) {
    const hours = Math.floor(secondsAgo / 3600);
    return `${hours}h ago`;
  }
  const days = Math.floor(secondsAgo / 86400);
  return `${days}d ago`;
};

export const isPhoneNumber = (subject: string) => subject.match(/^\+?\d{10,13}$/);
