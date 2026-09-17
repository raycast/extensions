import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { buildUdemyUrl, courseCouponUrl, courseDetailUrl, parseCourseDetail } from "./api";
import type { CourseDetail, CourseSummary } from "./types";
import {
  formatDate,
  formatEnrollments,
  getCategoryIcon,
  getRatingColor,
  getStarDisplay,
  TelegramAction,
} from "./utils";

interface CourseDetailProps {
  course: CourseSummary;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
  onBack: () => void;
}

const backShortcut: Keyboard.Shortcut = {
  modifiers: ["cmd"],
  key: "b",
  Windows: { modifiers: ["ctrl"], key: "b" },
};

export function CourseDetail({ course, isFavorite, onToggleFavorite, onBack }: CourseDetailProps) {
  const { isLoading, data, error, revalidate } = useFetch<CourseDetail>(courseDetailUrl(course.slug), {
    parseResponse: parseCourseDetail,
    failureToastOptions: {
      title: "Failed to fetch course details",
      message: "Could not retrieve the course information",
    },
  });

  const detail: CourseDetail = data ?? { ...course };
  const rating = Number(detail.rating) || 0;
  const udemyUrl = buildUdemyUrl(detail);
  const couponUrl = courseCouponUrl(detail.slug);

  const markdown = isLoading
    ? "# Loading…"
    : `
# ${detail.title}

![Course Thumbnail](${detail.image})

---

## 📚 Course Information

**👨‍🏫 Instructor:** ${detail.author?.displayName ?? "Unknown"}

**🏷️ Category:** ${detail.category}

**⭐ Rating:** ${rating}/5.0 ${getStarDisplay(detail.rating)}

**🗣️ Language:** ${detail.language ?? "Unknown"}

**⏱️ Course Length:** ${detail.courseLength ?? "N/A"}

**👥 Enrollments:** ${formatEnrollments(detail.enrollments) || "N/A"}

**📅 Last Updated:** ${formatDate(detail.updatedAt)}

---

## 📖 Description

${detail.body || "*No description available for this course.*"}

---

## 🎓 How to Enroll

This course is available **FREE** with a coupon code! Click the button below to grab your free coupon and enroll on Udemy.

> **⚡ Note:** Free coupon availability may be limited. Enroll quickly to secure your spot!
    `;

  const actions = (
    <ActionPanel>
      <ActionPanel.Section title="Course Actions">
        <Action.OpenInBrowser url={couponUrl} title="Grab Free Coupon" icon={Icon.Gift} />
        {detail.couponCode ? (
          <Action.CopyToClipboard
            content={detail.couponCode}
            title="Copy Coupon Code"
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        ) : null}
        {udemyUrl ? <Action.OpenInBrowser url={udemyUrl} title="View on Udemy" icon={Icon.Globe} /> : null}
        <Action
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
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
        <Action title="Back to Courses" icon={Icon.ArrowLeft} onAction={onBack} shortcut={backShortcut} />
      </ActionPanel.Section>
    </ActionPanel>
  );

  if (error) {
    return (
      <Detail
        markdown={`# Oops\n\nSomething went wrong fetching this course.\n\n> ${error.message}`}
        actions={actions}
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Course Title" text={detail.title} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Instructor" text={detail.author?.displayName ?? "Unknown"} icon={Icon.Person} />
          <Detail.Metadata.Label title="Category" text={detail.category} icon={getCategoryIcon(detail.category)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Rating">
            <Detail.Metadata.TagList.Item text={`⭐ ${rating}/5.0`} color={getRatingColor(detail.rating)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Language" text={detail.language ?? "Unknown"} icon={Icon.Globe} />
          <Detail.Metadata.Label title="Course Length" text={detail.courseLength ?? "N/A"} icon={Icon.Clock} />
          <Detail.Metadata.Label
            title="Enrollments"
            text={formatEnrollments(detail.enrollments) || "N/A"}
            icon={Icon.Person}
          />
          <Detail.Metadata.Label title="Last Updated" text={formatDate(detail.updatedAt)} icon={Icon.Clock} />
          <Detail.Metadata.Separator />
          {udemyUrl ? <Detail.Metadata.Link title="Course URL" text="View on Udemy" target={udemyUrl} /> : null}
          <Detail.Metadata.Link title="Free Coupon" text="Grab Free Coupon" target={couponUrl} />
        </Detail.Metadata>
      }
      actions={actions}
    />
  );
}
