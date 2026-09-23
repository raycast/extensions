import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Grid, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CATEGORIES, courseCouponUrl, fetchAllCourses } from "./api";
import type { CourseSummary } from "./types";
import {
  formatDate,
  formatEnrollments,
  formatRating,
  getCategoryIcon,
  parseEnrollments,
  TelegramAction,
  useDebouncedValue,
} from "./utils";

type SortKey = "newest" | "rating" | "enrolled" | "title";

const FAVORITES_FILTER = "__favorites__";

interface CourseGridProps {
  favorites: string[];
  isFavorite: (slug: string) => boolean;
  onToggleFavorite: (slug: string) => void;
  onSelect: (course: CourseSummary) => void;
}

export function CourseGrid({ favorites, isFavorite, onToggleFavorite, onSelect }: CourseGridProps) {
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebouncedValue(searchText.trim(), 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const isFavoritesView = selectedCategory === FAVORITES_FILTER;

  // Search runs server-side in both views. Favorites span every category, so category is
  // ignored there and the fetched set is intersected with saved favorite slugs. With no
  // search text, favorites fetch the full catalogue so every saved course shows; with a
  // query, only favorites matching it remain. usePromise re-runs when the args change.
  const { isLoading, data, error, revalidate } = usePromise(
    (isFav: boolean, search: string, category: string) =>
      fetchAllCourses({
        search: search || undefined,
        category: isFav || category === "all" ? undefined : category,
      }),
    [isFavoritesView, debouncedSearch, selectedCategory],
  );

  const favoriteSlugs = useMemo(() => new Set(favorites), [favorites]);

  const filteredCourses = useMemo(() => {
    let list = data ?? [];
    if (isFavoritesView) {
      list = list.filter((course) => favoriteSlugs.has(course.slug));
    }

    const sorted = [...list];
    switch (sortKey) {
      case "rating":
        sorted.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        break;
      case "enrolled":
        sorted.sort((a, b) => parseEnrollments(b.enrollments) - parseEnrollments(a.enrollments));
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    return sorted;
  }, [data, sortKey, isFavoritesView, favoriteSlugs]);

  if (error) {
    return (
      <Grid>
        <Grid.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Something went wrong"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search courses by title, author, or category..."
      navigationTitle={`${filteredCourses.length} Free Udemy Courses`}
      searchBarAccessory={
        <>
          <Grid.Dropdown
            tooltip="Filter by Category"
            storeValue
            value={selectedCategory}
            onChange={setSelectedCategory}
          >
            <Grid.Dropdown.Item title="All Categories" value="all" icon={Icon.AppWindowGrid3x3} />
            <Grid.Dropdown.Item title="⭐ Favorites" value={FAVORITES_FILTER} icon={Icon.Star} />
            <Grid.Dropdown.Section title="Categories">
              {CATEGORIES.map((category) => (
                <Grid.Dropdown.Item key={category} title={category} value={category} icon={getCategoryIcon(category)} />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
          <Grid.Dropdown
            tooltip="Sort by"
            storeValue
            value={sortKey}
            onChange={(value) => setSortKey(value as SortKey)}
          >
            <Grid.Dropdown.Item title="Newest" value="newest" icon={Icon.Clock} />
            <Grid.Dropdown.Item title="Highest Rated" value="rating" icon={Icon.Star} />
            <Grid.Dropdown.Item title="Most Enrolled" value="enrolled" icon={Icon.Person} />
            <Grid.Dropdown.Item title="Title (A–Z)" value="title" icon={Icon.Text} />
          </Grid.Dropdown>
        </>
      }
    >
      {filteredCourses.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          title="No courses found"
          description="Try adjusting your search or filter criteria"
        />
      ) : (
        filteredCourses.map((course) => {
          const favorite = isFavorite(course.slug);
          return (
            <Grid.Item
              key={course.slug}
              content={{
                source: course.image || Icon.Book,
                fallback: Icon.Book,
              }}
              title={favorite ? `⭐ ${course.title}` : course.title}
              subtitle={`${formatRating(course.rating)} · ${formatEnrollments(course.enrollments) || "No enrollments"} · ${formatDate(course.updatedAt)}`}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Course Details">
                    <Action title="View Course Details" icon={Icon.Eye} onAction={() => onSelect(course)} />
                    <Action.OpenInBrowser
                      url={courseCouponUrl(course.slug)}
                      title="Grab Free Coupon"
                      icon={Icon.Gift}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                    <Action
                      title={favorite ? "Remove from Favorites" : "Add to Favorites"}
                      icon={favorite ? Icon.StarDisabled : Icon.Star}
                      onAction={() => onToggleFavorite(course.slug)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <TelegramAction />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => revalidate()}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </Grid>
  );
}
