function getProgressBar(progressNum: number, options: { limit?: number } = {}) {
  const { limit = 10 } = options;
  let progressBar = "";
  for (let i = 0; i < limit; i++) {
    progressBar += progressNum > i * limit ? "■" : "□";
  }
  return progressBar;
}

export function getSubtitle(progressNum: number) {
  return `${getProgressBar(progressNum)} ${progressNum}%`;
}
