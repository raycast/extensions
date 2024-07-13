import { environment, LocalStorage } from "@raycast/api";
import path from "path";
import fs from "fs";
import { Exercise } from "../interfaces/exercise";

let cachedExercises: Exercise[] | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function loadExercises(): Promise<Exercise[]> {
  if (cachedExercises !== null) {
    return cachedExercises;
  }

  const lastLoadTime = await LocalStorage.getItem<string>("lastExerciseLoadTime");
  const currentTime = new Date().getTime();

  if (lastLoadTime && currentTime - parseInt(lastLoadTime) < CACHE_DURATION) {
    const storedExercises = await LocalStorage.getItem<string>("cachedExercises");
    if (storedExercises) {
      const parsedExercises = JSON.parse(storedExercises) as Exercise[];
      cachedExercises = parsedExercises;
      return parsedExercises;
    }
  }

  try {
    const filePath = path.join(environment.assetsPath, "llm_exercises_with_tags.json");
    const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as Exercise[];
    cachedExercises = data;
    await LocalStorage.setItem("cachedExercises", JSON.stringify(data));
    await LocalStorage.setItem("lastExerciseLoadTime", currentTime.toString());
    return data;
  } catch (error) {
    console.error("Error reading exercise file:", error);
    throw new Error("Failed to load exercises");
  }
}

export async function getExerciseById(id: string): Promise<Exercise | undefined> {
  const exercises = await loadExercises();
  return exercises.find((exercise) => exercise.id === id);
}

export async function getAllExercises(): Promise<Exercise[]> {
  return await loadExercises();
}
