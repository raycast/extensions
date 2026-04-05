function fuzzyMatchScore(keyword: string, target: string): number {
  if (!keyword) return 1;
  const keyMatch = keyword.toLowerCase();
  const targetMatch = target.toLowerCase();
  
  let baseScore = 0;
  if (targetMatch.includes(keyMatch)) {
    baseScore += 100;
    if (targetMatch.startsWith(keyMatch)) {
      baseScore += 50;
    }
  }

  const keyChars = Array.from(keyMatch);
  const targetChars = Array.from(targetMatch);
  let keyIndex = 0;
  let score = baseScore;
  let lastMatchIndex = -2;

  for (let i = 0; i < targetChars.length; i++) {
    if (keyIndex >= keyChars.length) break;
    const char = targetChars[i];
    if (char === keyChars[keyIndex]) {
      score += 1;
      if (i === lastMatchIndex + 1) {
        score += 5;
      }
      if (i === 0 || (i > 0 && "-_/. ".includes(targetChars[i - 1]))) {
        score += 10;
      }
      lastMatchIndex = i;
      keyIndex += 1;
    }
  }

  return keyIndex === keyChars.length ? score : 0;
}

const keyword = "proman";

const t1 = "pro-management";
const p1 = "/Users/louis.ning/project/macos-project/pro-management";

const t2 = "maglev-config-model";
const p2 = "/Users/louis.ning/project/maglev/maglev-config-model";

console.log("---- pro-management ----");
const nameScore1 = fuzzyMatchScore(keyword, t1);
const pathScore1 = fuzzyMatchScore(keyword, p1) * 0.5;
console.log("name:", nameScore1, "path:", pathScore1, "final:", nameScore1 > 0 ? nameScore1 * 2 : pathScore1);

console.log("---- maglev-config-model ----");
const nameScore2 = fuzzyMatchScore(keyword, t2);
const pathScore2 = fuzzyMatchScore(keyword, p2) * 0.5;
console.log("name:", nameScore2, "path:", pathScore2, "final:", nameScore2 > 0 ? nameScore2 * 2 : pathScore2);
