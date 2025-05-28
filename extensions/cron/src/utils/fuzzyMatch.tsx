export default function fuzzyMatch(searchText: string, targetText: string): boolean {
  const searchTextLower = searchText.toLowerCase();
  const targetTextLower = targetText.toLowerCase();
  let searchIndex = 0;
  for (let targetIndex = 0; targetIndex < targetTextLower.length; targetIndex++) {
    if (searchTextLower[searchIndex] === targetTextLower[targetIndex]) {
      searchIndex++;
      if (searchIndex >= searchTextLower.length) {
        return true;
      }
    }
  }
  return false;
}
