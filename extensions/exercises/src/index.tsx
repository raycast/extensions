import React, { useState, useEffect, useMemo } from "react";
import { List, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import ExerciseDetails from "./components/ExerciseDetails";
import TagDropdown from "./components/TagDropDown";
import { moveFavorite, removeFavorite, getExerciseLabels } from "./utils";
import { loadExercises } from "./utils/exerciseUtils";
import { Exercise } from "./interfaces/exercise";

interface ExerciseListProps {
  initialSelectedTag?: string;
}

export default function ExerciseList({ initialSelectedTag = "" }: ExerciseListProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchText, setSearchText] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(initialSelectedTag);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const data = await loadExercises();
        setExercises(data);
      } catch (error) {
        console.error("Error loading exercises:", error);
        showToast(Toast.Style.Failure, "Failed to load exercises", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchFavorites = async (): Promise<void> => {
      try {
        const storedFavorites = await LocalStorage.getItem<string>("favorites");
        if (storedFavorites) {
          const parsedFavorites = JSON.parse(storedFavorites) as string[];
          setFavorites(parsedFavorites);
          console.log("Fetched favorites:", parsedFavorites);
        } else {
          setFavorites([]);
          console.log("No favorites found, initializing to empty array");
        }
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    };

    fetchFavorites();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % (exercises[0]?.images.length || 1));
    }, 1000); // Change image every 1000 milliseconds (1 second)

    return () => clearInterval(intervalId); // Clear interval on component unmount
  }, [exercises]);

  const updateFavorites = async (newFavorites: string[]): Promise<void> => {
    console.log("Updating favorites to:", newFavorites);
    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
    console.log("Updated favorites in LocalStorage:", newFavorites);
  };

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      const aIndex = favorites.indexOf(a.name);
      const bIndex = favorites.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [exercises, favorites]);

  const filteredExercises = useMemo(() => {
    return sortedExercises.filter((exercise) => {
      const lowerSearchText = searchText.toLowerCase();
      const matchesSearchText =
        exercise.name.toLowerCase().includes(lowerSearchText) ||
        (exercise.short_description?.toLowerCase().includes(lowerSearchText) ?? false) ||
        (exercise.new_instructions?.toLowerCase().includes(lowerSearchText) ?? false) ||
        (exercise.tip?.toLowerCase().includes(lowerSearchText) ?? false) ||
        (exercise.subtitle?.toLowerCase().includes(lowerSearchText) ?? false) ||
        exercise.tags.some((tag) => tag.toLowerCase().includes(lowerSearchText));
      const matchesTag = selectedTag ? exercise.tags.includes(selectedTag) : true;
      return matchesSearchText && matchesTag;
    });
  }, [sortedExercises, searchText, selectedTag]);

  const memoizedTagDropdown = useMemo(
    () => <TagDropdown selectedTag={selectedTag} setSelectedTag={setSelectedTag} />,
    [selectedTag, setSelectedTag],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search exercises by name, equipment, or muscle"
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={memoizedTagDropdown}
    >
      {filteredExercises.map((exercise, index) => (
        <List.Item
          key={index}
          title={exercise.name}
          accessories={favorites.includes(exercise.name) ? [{ text: "⭐" }] : []}
          detail={
            <List.Item.Detail
              markdown={`![img](https://raw.githubusercontent.com/yuhonas/free-exercise-db/5197c055b356498944328bd00178b64a5e9f422c/exercises/${exercise.images[currentImageIndex]}?raycast-width=200)\n\n
${getExerciseLabels(exercise)}
## ${exercise.subtitle}\n
${exercise.short_description}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                target={
                  <ExerciseDetails
                    exercise={exercise}
                    favorites={favorites}
                    setFavorites={setFavorites}
                    updateFavorites={updateFavorites}
                    setSelectedTag={setSelectedTag}
                  />
                }
              />
              <Action
                title="Move up in Favorites"
                onAction={() => moveFavorite(exercise.name, "up", favorites, setFavorites, updateFavorites)}
                shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
              />
              <Action
                title="Move Down in Favorites"
                onAction={() => moveFavorite(exercise.name, "down", favorites, setFavorites, updateFavorites)}
                shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
              />
              <Action
                title="Remove From Favorites"
                onAction={() => removeFavorite(exercise.name, favorites, setFavorites, updateFavorites)}
                shortcut={{ modifiers: ["cmd", "opt"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
