export function isNearBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold = 64,
): boolean {
  return scrollHeight - clientHeight - scrollTop <= threshold;
}
export function restoreReadingPosition(
  scrollTop: number,
  previousAnchorOffset: number,
  currentAnchorOffset: number,
): number {
  return Math.max(0, scrollTop + currentAnchorOffset - previousAnchorOffset);
}
export function shouldFollowLatest(
  initialLoad: boolean,
  alreadyFollowing: boolean,
  loadingOlder: boolean,
): boolean {
  return initialLoad || (alreadyFollowing && !loadingOlder);
}
