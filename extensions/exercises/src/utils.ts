import { Exercise } from "./interfaces/exercise";

export const moveFavorite = (
  exerciseName: string,
  direction: "up" | "down",
  favorites: string[],
  setFavorites: (favorites: string[]) => void,
  updateFavorites: (newFavorites: string[]) => Promise<void>,
) => {
  //console.log("Move Favorites:", favorites); // Log current favorites before moving
  const newFavorites = [...favorites];
  const index = newFavorites.indexOf(exerciseName);

  if (index === -1) {
    // Add to favorites if not already present
    newFavorites.push(exerciseName);
  } else {
    if (direction === "up" && index > 0) {
      [newFavorites[index - 1], newFavorites[index]] = [newFavorites[index], newFavorites[index - 1]];
    } else if (direction === "down" && index < newFavorites.length - 1) {
      [newFavorites[index + 1], newFavorites[index]] = [newFavorites[index], newFavorites[index + 1]];
    }
  }

  updateFavorites(newFavorites);
};

export const removeFavorite = (
  exerciseName: string,
  favorites: string[],
  setFavorites: (favorites: string[]) => void,
  updateFavorites: (newFavorites: string[]) => Promise<void>,
) => {
  //console.log("Remove Favorite:", favorites); // Log current favorites before removing
  const newFavorites = favorites.filter((fav) => fav !== exerciseName);
  updateFavorites(newFavorites);
};

export const getExerciseLabels = (exercise: Exercise) => {
  const secondaryMuscles =
    exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0
      ? `, ${exercise.secondaryMuscles.join(", ")}`
      : "";

  return `
🏋️‍♂️ ${exercise.level}
😅 ${exercise.category} 
💪 ${exercise.primaryMuscles}${secondaryMuscles}
🔧 ${exercise.equipment || "bodyweight"}\n
  `;
};
