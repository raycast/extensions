export function formatOSSInsight(userId: number, username: string, appearance: string): string {
  const dashboard = new URL("https://next.ossinsight.io/widgets/official/compose-user-dashboard-stats");
  dashboard.searchParams.set("user_id", String(userId));

  const recentWork = new URL("https://next.ossinsight.io/widgets/official/compose-currently-working-on");
  recentWork.searchParams.set("user_id", String(userId));
  recentWork.searchParams.set("activity_type", "all");

  const thumbnail = (widget: URL) => {
    const image = new URL(widget);
    image.pathname += "/thumbnail.png";
    image.searchParams.set("image_size", "auto");
    image.searchParams.set("color_scheme", appearance);
    // Raycast needs a display width independently of the thumbnail's pixel resolution.
    image.searchParams.set("raycast-width", "650");
    return image.toString();
  };

  return `## Public Activity\n\nOSS Insight provides these charts from public GitHub activity. Its totals and update timing can differ from GitHub's contribution calendar.\n\n[![Dashboard statistics for ${username}](${thumbnail(dashboard)})](${dashboard})\n\n### Recent Work\n\n[![Recent work over the last 28 days](${thumbnail(recentWork)})](${recentWork})`;
}
