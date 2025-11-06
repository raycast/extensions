import { useState } from "react";
import { ActionPanel, Action, Icon, Grid, Detail, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { formatDistance } from "date-fns";

// Define the structure of a course item based on the Android app
interface Course {
  id: string;
  courseid?: string;
  title: string;
  image: string;
  author: {
    displayName: string;
  };
  category: string;
  rating: number;
  slug: string;
  expired: boolean;
  updatedAt: string;
  couponCode?: string;
  language?: string;
  enrollments?: string;
  body?: string;
}

// Define the structure of the API response
interface ApiResponse {
  data: Course[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Define the structure of the raw API response item
interface RawCourseItem {
  id: string;
  courseid?: string;
  title?: string;
  image?: string;
  author?: {
    displayName: string;
  };
  category?: string;
  rating?: number;
  slug?: string;
  expired?: boolean;
  updatedAt?: string;
  couponCode?: string;
  language?: string;
  enrollments?: string;
  body?: string;
}

// Helper function to get category icon
function getCategoryIcon(category: string): Icon {
  const categoryMap: { [key: string]: Icon } = {
    Development: Icon.Code,
    Business: Icon.LockUnlocked,
    "Finance & Accounting": Icon.BankNote,
    "IT & Software": Icon.ComputerChip,
    "Office Productivity": Icon.Document,
    "Personal Development": Icon.PersonCircle,
    Design: Icon.Brush,
    Marketing: Icon.Megaphone,
    "Health & Fitness": Icon.Heart,
    Music: Icon.Music,
    "Teaching & Academics": Icon.Book,
    "Photography & Video": Icon.Camera,
    Lifestyle: Icon.Star,
  };

  return categoryMap[category] || Icon.Tag;
}

// Helper function to get rating color
function getRatingColor(rating: number): Color {
  if (rating >= 4.5) return Color.Green;
  if (rating >= 4.0) return Color.Blue;
  if (rating >= 3.5) return Color.Yellow;
  return Color.Orange;
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return formatDistance(date, new Date(), {
    addSuffix: true,
  });
}

// Helper function to get star emoji based on rating
function getStarDisplay(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return "⭐".repeat(fullStars) + (hasHalfStar ? "½" : "") + "☆".repeat(emptyStars);
}

export default function Command() {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Build query string similar to the Android app
  const queryParams = new URLSearchParams({
    fields: ["courseid", "title", "image", "rating", "author", "category", "slug", "updatedAt", "expired", "body"].join(
      ",",
    ),
    "pagination[page]": "1",
    "pagination[pageSize]": "100",
    "sort[0]": "updatedAt:desc",
    "filters[expired][$eq]": "false",
  });

  const apiUrl = `https://api.couponcode.dev/api/udemy-courses?${queryParams}`;

  const { isLoading, data, error } = useFetch<Course[]>(apiUrl, {
    parseResponse: async (response: Response) => {
      const result = (await response.json()) as ApiResponse;

      // Transform the data to match our Course interface
      const transformedCourses: Course[] = result.data.map((item: RawCourseItem) => ({
        id: item.id,
        courseid: item.courseid,
        title: item.title || "Untitled Course",
        image: item.image || "",
        author: item.author || {
          displayName: "Unknown Author",
        },
        category: item.category || "General",
        rating: item.rating || 0,
        slug: item.slug || "",
        expired: item.expired || false,
        updatedAt: item.updatedAt || new Date().toISOString(),
        body: item.body,
      }));

      return transformedCourses;
    },
    failureToastOptions: {
      title: "Failed to fetch courses",
      message: "Could not retrieve the latest course information",
    },
  });

  // Filter courses by category
  const filteredCourses =
    selectedCategory === "all" ? data || [] : (data || []).filter((course) => course.category === selectedCategory);

  // Get unique categories sorted alphabetically
  const categories = ["all", ...Array.from(new Set((data || []).map((c) => c.category))).sort()];

  if (error) {
    return (
      <Grid>
        <Grid.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Something went wrong"
          description={error.message}
        />
      </Grid>
    );
  }

  if (selectedCourse) {
    const markdown = `
# ${selectedCourse.title}

![Course Thumbnail](${selectedCourse.image})

---

## 📚 Course Information

**👨‍🏫 Instructor:** ${selectedCourse.author.displayName}

**🏷️ Category:** ${selectedCourse.category}

**⭐ Rating:** ${selectedCourse.rating}/5.0 ${getStarDisplay(selectedCourse.rating)}

**📅 Last Updated:** ${formatDate(selectedCourse.updatedAt)}

---

## 📖 Description

${selectedCourse.body || "*No description available for this course.*"}

---

## 🎓 How to Enroll

This course is available **FREE** with a coupon code! Click the button below to grab your free coupon and enroll on Udemy.

> **⚡ Note:** Free coupon availability may be limited. Enroll quickly to secure your spot!
    `;

    return (
      <Detail
        markdown={markdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Course Title" text={selectedCourse.title} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Instructor" text={selectedCourse.author.displayName} icon={Icon.Person} />
            <Detail.Metadata.Label
              title="Category"
              text={selectedCourse.category}
              icon={getCategoryIcon(selectedCourse.category)}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.TagList title="Rating">
              <Detail.Metadata.TagList.Item
                text={`⭐ ${selectedCourse.rating}/5.0`}
                color={getRatingColor(selectedCourse.rating)}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Last Updated" text={formatDate(selectedCourse.updatedAt)} icon={Icon.Clock} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link
              title="Course URL"
              text="View on Udemy"
              target={`https://www.udemy.com/course/${selectedCourse.slug}/`}
            />
            <Detail.Metadata.Link
              title="Free Coupon"
              text="Grab Free Coupon"
              target={`https://couponcode.dev/udemy/course/${selectedCourse.slug}/`}
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Course Actions">
              <Action.OpenInBrowser
                url={`https://couponcode.dev/udemy/course/${selectedCourse.slug}/`}
                title="Grab Free Coupon"
                icon={Icon.Gift}
              />
              <Action.OpenInBrowser
                url="https://t.me/couponcodedev"
                title="Join Our Telegram Channel"
                icon={Icon.AirplaneTakeoff}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Back to Courses"
                icon={Icon.ArrowLeft}
                onAction={() => setSelectedCourse(null)}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid
      columns={3}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      filtering={true}
      searchBarPlaceholder="Search courses by title, author, or category..."
      navigationTitle={`${filteredCourses.length} Free Udemy Courses`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Category" storeValue value={selectedCategory} onChange={setSelectedCategory}>
          <Grid.Dropdown.Item
            title={`All Categories (${data?.length || 0})`}
            value="all"
            icon={Icon.AppWindowGrid3x3}
          />
          <Grid.Dropdown.Section title="Categories">
            {categories
              .filter((cat) => cat !== "all")
              .map((category) => {
                const count = (data || []).filter((c) => c.category === category).length;
                return (
                  <Grid.Dropdown.Item
                    key={category}
                    title={`${category} (${count})`}
                    value={category}
                    icon={getCategoryIcon(category)}
                  />
                );
              })}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredCourses.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          title="No courses found"
          description="Try adjusting your search or filter criteria"
        />
      ) : (
        filteredCourses.map((course) => (
          <Grid.Item
            key={course.id}
            content={{
              source: course.image || Icon.Book,
              fallback: Icon.Book,
            }}
            title={course.title}
            subtitle={`${formatDate(course.updatedAt)} • ${course.category}`}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Course Details">
                  <Action title="View Course Details" icon={Icon.Eye} onAction={() => setSelectedCourse(course)} />
                  <Action.OpenInBrowser
                    url={`https://couponcode.dev/udemy/course/${course.slug}/`}
                    title="Grab Free Coupon"
                    icon={Icon.Gift}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.OpenInBrowser
                    url="https://t.me/couponcodedev"
                    title="Join Our Telegram Channel"
                    icon={Icon.AirplaneTakeoff}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
