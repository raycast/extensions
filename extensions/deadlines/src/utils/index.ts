export function getProgressBar(progress: number) {
  let progressBar = "";
  for (let i = 0; i < 10; i++) {
    progressBar += progress > i * 10 ? "■" : "□";
  }
  return progressBar;
}

export function calculateProgress(startDate: Date, endDate: Date) {
  const currentDate = new Date();

  const totalDuration = new Date(endDate).getTime() - new Date(startDate).getTime();
  const elapsedDuration = currentDate.getTime() - new Date(startDate).getTime();

  const progressPercentage = (elapsedDuration / totalDuration) * 100;

  return Math.round(progressPercentage);
}
