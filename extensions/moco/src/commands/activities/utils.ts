export function timeDelta(timerStartString: string): number {
  return (Date.now() - Date.parse(timerStartString)) / 1000;
}

export function secondsParser(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsLeft = Math.floor(seconds % 60);

  return `${hours}:${minutes > 9 ? minutes : `0${minutes}`}:${secondsLeft > 9 ? secondsLeft : `0${secondsLeft}`}`;
}
