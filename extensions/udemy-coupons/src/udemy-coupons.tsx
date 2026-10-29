import { useState } from "react";
import type { CourseSummary } from "./types";
import { useFavorites } from "./favorites";
import { CourseGrid } from "./CourseGrid";
import { CourseDetail } from "./CourseDetail";

export default function Command() {
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  if (selectedCourse) {
    return (
      <CourseDetail
        course={selectedCourse}
        isFavorite={favorites.includes(selectedCourse.slug)}
        onToggleFavorite={toggleFavorite}
        onBack={() => setSelectedCourse(null)}
      />
    );
  }

  return (
    <CourseGrid
      favorites={favorites}
      isFavorite={(slug) => favorites.includes(slug)}
      onToggleFavorite={toggleFavorite}
      onSelect={setSelectedCourse}
    />
  );
}
