import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState, useMemo } from "react";
import { fetchProfile, ProfileData, escapeXml } from "./utils/api";

export default function Command() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await fetchProfile();
      setProfile(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading statistics",
        message: error.message || "",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  // 2027 Apple style Stats Dashboard SVG
  const svgUri = useMemo(() => {
    if (!profile) return "";

    const streak = profile.streak_days;
    const points = profile.puntos_totales.toLocaleString();
    const rawDisplayName = profile.display_name || profile.email || "Guest";
    const displayName = escapeXml(rawDisplayName.toUpperCase());
    const focusMin = profile.stats.focus_minutes;

    const svg = `
<svg width="100%" viewBox="0 0 560 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glowOrange" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  <!-- Card Base -->
  <rect width="560" height="240" rx="32" fill="url(#bgGrad)" stroke="#334155" stroke-width="1.5"/>
  
  <!-- Header Glass -->
  <rect x="1" y="1" width="558" height="60" rx="31" fill="white" fill-opacity="0.02" />
  <text x="32" y="36" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" letter-spacing="1.5">MY DAILY PERFORMANCE</text>
  <text x="528" y="36" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700" text-anchor="end">${displayName}</text>

  <!-- Left Stats: Streak -->
  <text x="32" y="96" fill="#f97316" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="1">FOCUS STREAK</text>
  <text x="32" y="152" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="-1" filter="url(#glowOrange)">${streak} 🔥</text>
  <text x="32" y="174" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600">consecutive active days</text>

  <!-- Divider -->
  <line x1="280" y1="80" x2="280" y2="180" stroke="#334155" stroke-width="1.5" />

  <!-- Right Stats: Points -->
  <text x="312" y="96" fill="#eab308" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="1">TOTAL POINTS</text>
  <text x="312" y="152" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" letter-spacing="-1" filter="url(#glowGold)">${points} 🏆</text>
  <text x="312" y="174" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600">productivity points earned</text>
  
  <!-- Footer Status Bar -->
  <rect x="32" y="204" width="496" height="2" fill="#334155" />
  <text x="32" y="222" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="700">TIME FOCUSED TODAY: ${focusMin} MINUTES</text>
</svg>
`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [profile]);

  const markdown = useMemo(() => {
    if (!profile) return "# Loading statistics...";
    return `![Statistics Dashboard](${svgUri})

### 📊 Performance Breakdown

* **Streak:** Active for **${profile.streak_days}** consecutive days.
* **Productivity Score:** Total points accumulated: **${profile.puntos_totales.toLocaleString()}** pts.
* **Focus Time:** You have focused for **${profile.stats.focus_minutes}** minutes today.
* **Work Sessions:** **${profile.stats.work_sessions}** sessions recorded today.
`;
  }, [profile, svgUri]);

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      metadata={
        profile ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="User"
              text={profile.display_name || "Guest"}
              icon={Icon.Person}
            />
            <Detail.Metadata.Label
              title="Email"
              text={profile.email || "Anonymous"}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Focus Time"
              text={`${profile.stats.focus_minutes} min`}
              icon={Icon.Clock}
            />
            <Detail.Metadata.Label
              title="Break Time"
              text={`${profile.stats.break_minutes} min`}
              icon={Icon.Calendar}
            />
            <Detail.Metadata.Label
              title="Overtime"
              text={`${profile.stats.overtime_minutes} min`}
              icon={Icon.Exclamationmark}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Work Sessions"
              text={`${profile.stats.work_sessions} sessions`}
              icon={Icon.Checkmark}
            />
            <Detail.Metadata.Label
              title="Break Sessions"
              text={`${profile.stats.break_sessions} sessions`}
              icon={Icon.Checkmark}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Tasks Created Today"
              text={`${profile.stats.tasks_created} tasks`}
              icon={Icon.Plus}
            />
            <Detail.Metadata.Label
              title="Tasks Completed Today"
              text={`${profile.stats.tasks_completed} tasks`}
              icon={Icon.CheckCircle}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Reload Statistics"
            icon={Icon.ArrowClockwise}
            onAction={loadStats}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
