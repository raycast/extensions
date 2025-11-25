import { Detail, ActionPanel, Action } from "@raycast/api";
import type { SessionResult } from "../types";
import { formatTime } from "../utils/time";

interface ResultProps {
  result: SessionResult;
  onRestart: () => void;
  onClose: () => void;
}

export function Result({ result, onRestart, onClose }: ResultProps) {
  const accuracyPercentage = (result.accuracy * 100).toFixed(1);
  const performanceLevel = getPerformanceLevel(result.cpm);

  const elapsedMinutes = result.durationSec / 60;
  const estimatedCorrect = Math.max(0, Math.round(result.cpm * elapsedMinutes));
  let totalAttempts = estimatedCorrect + result.mistakes;
  let correctCount = estimatedCorrect;

  if (result.accuracy > 0 && result.accuracy < 1) {
    totalAttempts = Math.round(result.mistakes / (1 - result.accuracy));
    correctCount = Math.round(totalAttempts * result.accuracy);
  }

  const averageWordTime = result.completedWords > 0 ? (result.durationSec / result.completedWords).toFixed(1) : null;
  const wordStats =
    result.practiceMode === "word"
      ? [
          `- **Words Completed**: ${result.completedWords}`,
          `- **Avg Time per Word**: ${averageWordTime ? `${averageWordTime}s` : "—"}`,
        ].join("\n")
      : "";

  return (
    <Detail
      markdown={`
# 🎯 Practice Results

## 📊 Performance Rating
### **${performanceLevel}**

---

## ⏱️ Time
- Duration: ${formatTime(result.durationSec)}

## 🚀 Speed
- **CPM**: ${result.cpm} (chars/min)
- **WPM**: ${result.wpm} (words/min)
${wordStats ? `\n${wordStats}` : ""}

## 🎯 Accuracy
- **Accuracy**: ${accuracyPercentage}%
  - **Total Keystrokes**: ${totalAttempts}
- **Correct**: ${correctCount}
- **Mistakes**: ${result.mistakes}

## 🔥 Streak
- **Best Streak**: ${result.streakMax}

## ⏭️ Other
- **Skips**: ${result.skips}

---

## 💡 Tips
${getAdvice(result)}

---
*Completed: ${new Date(result.finishedAt).toLocaleString("en-US")}*
      `.trim()}
      actions={
        <ActionPanel>
          <Action title="Practice Again" onAction={onRestart} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          <Action title="Close" onAction={onClose} shortcut={{ modifiers: ["cmd"], key: "w" }} />
        </ActionPanel>
      }
    />
  );
}

function getPerformanceLevel(cpm: number): string {
  if (cpm >= 400) return "🏆 S Rank (Master)";
  if (cpm >= 350) return "🥇 A Rank (Advanced)";
  if (cpm >= 300) return "🥈 B Rank (Intermediate)";
  if (cpm >= 250) return "🥉 C Rank (Elementary)";
  if (cpm >= 200) return "📚 D Rank (Novice)";
  return "🌱 E Rank (Beginner)";
}

function getAdvice(result: SessionResult): string {
  const { cpm, accuracy, mistakes, streakMax } = result;

  const advice = [];

  if (cpm < 250) {
    advice.push("• **Improve Speed**: Focus on home row position and practice quick finger movements.");
  }

  if (accuracy < 0.9) {
    advice.push("• **Improve Accuracy**: Slow down and focus on hitting the correct keys.");
  }

  if (mistakes > 10) {
    advice.push("• **Reduce Mistakes**: Practice difficult character combinations more often.");
  }

  if (streakMax < 20) {
    advice.push("• **Build Streaks**: Start with shorter words to build consistent accuracy.");
  }

  if (advice.length === 0) {
    advice.push("• Excellent performance! Keep practicing to maintain your skills.");
  }

  return advice.join("\\n");
}
