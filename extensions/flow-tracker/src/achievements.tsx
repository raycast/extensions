import { useState } from "react";
import { Achievement } from "./types/index";
import { AchievementsGrid } from "./components/achievements/AchievementsGrid";
import { AchievementDetails } from "./components/achievements/AchievementDetails";
import { useAchievements } from "./hooks/useAchievements";

export default function AchievementsPage() {
  const { achievements } = useAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const handleSelectAchievement = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
  };

  const handleBack = () => {
    setSelectedAchievement(null);
  };

  // Sort achievements by unlocked status: unlocked first, then locked
  const sortedAchievements = achievements.sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1; // 'a' should come first
    if (!a.unlocked && b.unlocked) return 1; // 'b' should come first
    return 0; // if both are either unlocked or locked, no change
  });

  if (selectedAchievement) {
    return <AchievementDetails achievement={selectedAchievement} onBack={handleBack} />;
  }

  return <AchievementsGrid achievements={sortedAchievements} onSelectAchievement={handleSelectAchievement} />;
}
