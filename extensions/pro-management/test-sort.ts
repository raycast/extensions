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

const projects = [
  { name: "maglev-config-model", path: "/Users/louis.ning/project/maglev/maglev-config-model" },
  { name: "pro-management", path: "/Users/louis.ning/project/macos-project/pro-management" }
];

const searchText = "proman";

const filtered = projects
  .map((project) => {
    const nameScore = fuzzyMatchScore(searchText, project.name);
    const pathScore = fuzzyMatchScore(searchText, project.path) * 0.5;
    const finalScore = nameScore > 0 ? nameScore * 2 : pathScore;
    console.log(`[${project.name}] nameScore: ${nameScore}, pathScore: ${pathScore}, finalScore: ${finalScore}`);
    return { project, score: finalScore };
  })
  .filter((item) => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .map((item) => item.project);

console.log("Sorted Result:");
filtered.forEach(p => console.log(p.name));
