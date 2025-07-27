// Check if current time is within the last week
export const isRecent = (date: Date) => {
  const now = new Date();
  const target = new Date(date);
  return now.getTime() - target.getTime() < 7 * 24 * 60 * 60 * 1000;
};

// 格式化评分
export const formatScore = (score: number | undefined) => {
  if (!score) return null;
  const calculatedScore = Math.min(score * 100 * 2, 100);
  return calculatedScore.toFixed(2) + "%";
};
