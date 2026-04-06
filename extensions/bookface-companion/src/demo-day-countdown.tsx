import {
  MenuBarExtra,
  open,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDemoDayDate } from "./lib/bookface";
import { hasCredentials } from "./lib/auth";

const ycIcon = {
  source: { light: "y-square-dark.svg", dark: "y-square.svg" },
};

function daysUntil(target: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return (target.getTime() - Date.now()) / msPerDay;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCountdown(totalDays: number): string {
  if (totalDays <= 0) return "🎉 Demo Day!";
  const d = Math.floor(totalDays);
  const h = Math.floor((totalDays - d) * 24);
  const m = Math.floor(((totalDays - d) * 24 - h) * 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

export default function Command() {
  const authenticated = hasCredentials();

  const { data: demoDay, isLoading } = useCachedPromise(
    async () => {
      if (!authenticated) return null;
      try {
        return await getDemoDayDate();
      } catch {
        return null;
      }
    },
    [],
    { keepPreviousData: true },
  );

  if (!authenticated) {
    return (
      <MenuBarExtra
        icon={ycIcon}
        tooltip="Set up YC credentials for demo day countdown"
      >
        <MenuBarExtra.Item
          icon={Icon.Lock}
          title="Login to see demo day"
          onAction={openExtensionPreferences}
        />
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={Icon.Globe}
            title="Open Bookface"
            onAction={() => open("https://bookface.ycombinator.com")}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  if (isLoading || !demoDay) {
    return <MenuBarExtra icon={ycIcon} title="..." isLoading={isLoading} />;
  }

  const days = daysUntil(demoDay);
  const title = formatCountdown(days);

  if (days < -1) {
    return (
      <MenuBarExtra icon={ycIcon} tooltip="Demo day has passed">
        <MenuBarExtra.Item
          icon={Icon.CheckCircle}
          title="Demo day has passed"
          subtitle={formatDate(demoDay)}
        />
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={Icon.Globe}
            title="Open Bookface"
            onAction={() => open("https://bookface.ycombinator.com")}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={ycIcon}
      title={title}
      tooltip={`Demo Day: ${formatDate(demoDay)}`}
    >
      <MenuBarExtra.Section title="Demo Day">
        <MenuBarExtra.Item
          icon={Icon.Calendar}
          title={formatDate(demoDay)}
          onAction={() => open("https://www.ycombinator.com/demoday")}
        />
        <MenuBarExtra.Item
          icon={Icon.Clock}
          title={days <= 0 ? "Today!" : formatCountdown(days) + " remaining"}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Bookface"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://bookface.ycombinator.com")}
        />
        <MenuBarExtra.Item
          icon={Icon.Calendar}
          title="Open Demo Day Page"
          onAction={() => open("https://www.ycombinator.com/demoday")}
        />
        <MenuBarExtra.Item
          icon={Icon.Gear}
          title="Configure Extension"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
