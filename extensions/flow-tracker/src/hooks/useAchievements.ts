import { useState, useEffect } from "react";
import { Achievement } from "../types/index";
import { ACHIEVEMENTS } from "../utils/constants";
import { getFocusLog } from "../utils/storage";

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    const focusLog = await getFocusLog();
    if (!focusLog) return;

    const updatedAchievements = ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      unlocked: achievement.condition(focusLog),
    }));

    setAchievements(updatedAchievements);
  };

  return { achievements, reloadAchievements: loadAchievements };
};
