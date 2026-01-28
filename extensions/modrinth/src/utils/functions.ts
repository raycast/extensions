export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Define time intervals in seconds
  const intervals: { [key: string]: number } = {
    year: 31536000, // 365 days
    month: 2592000, // 30 days
    week: 604800, // 7 days
    day: 86400, // 1 day
    hour: 3600, // 1 hour
    minute: 60, // 1 minute
  };

  let unit: string;
  let count: number;

  // Handle future dates
  if (seconds < 0) {
    return "In the future";
  }

  // Determine how long ago the date is
  if (seconds >= intervals.year) {
    unit = "Year";
    count = Math.floor(seconds / intervals.year);
  } else if (seconds >= intervals.month) {
    unit = "Month";
    count = Math.floor(seconds / intervals.month);
  } else if (seconds >= intervals.week) {
    unit = "Week";
    count = Math.floor(seconds / intervals.week);
  } else if (seconds >= intervals.day) {
    unit = "Day";
    count = Math.floor(seconds / intervals.day);
  } else if (seconds >= intervals.hour) {
    unit = "Hour";
    count = Math.floor(seconds / intervals.hour);
  } else {
    // If less than 1 hour, return "1 minute ago"
    unit = "Minute";
    count = 1; // Minimum count is 1 minute
  }

  // Format return value, handling pluralization
  const plural = count > 1 ? "s" : "";
  return `${count} ${unit}${plural} ago`;
}

export function formatMinecraftVersions(versions: string[]): string[] {
  // Helper function to normalize version (e.g., "1.18" becomes "1.18.0")
  const normalizeVersion = (version: string): string => {
    const parts = version.split(".");
    if (parts.length === 2) return `${parts[0]}.${parts[1]}.0`;
    return version;
  };

  // Helper function to get major version from a version string
  const getMajorVersion = (version: string): string => {
    const match = version.match(/^(\d+\.\d+)/);
    if (match) return match[1];
    return "";
  };

  // Normalize and filter versions (exclude pre-releases, snapshots, etc.)
  const normalizedVersions = versions.filter((str) => !/[a-zA-Z]/.test(str)).map(normalizeVersion);

  // Group versions by major version number
  const grouped = normalizedVersions.reduce((acc: { [key: string]: Set<string> }, version: string) => {
    const majorVersion = getMajorVersion(version);
    if (majorVersion) {
      if (!acc[majorVersion]) {
        acc[majorVersion] = new Set();
      }
      acc[majorVersion].add(version);
    }
    return acc;
  }, {});

  // Convert grouped versions to range strings
  return Object.entries(grouped)
    .map(([, versions]) => {
      const sortedVersions = Array.from(versions)
        .map((v) => {
          const parts = v.split(".");
          return {
            version: v,
            major: parseInt(parts[0]),
            minor: parseInt(parts[1]),
            patch: parseInt(parts[2] || "0"),
          };
        })
        .sort((a, b) => {
          if (a.major !== b.major) return a.major - b.major;
          if (a.minor !== b.minor) return a.minor - b.minor;
          return a.patch - b.patch;
        });

      if (sortedVersions.length <= 1) {
        const version = sortedVersions[0]?.version;
        // Simplify output (e.g., "1.18.0" becomes "1.18")
        return version ? [version.replace(/\.0$/, "")] : [];
      }

      const result: string[] = [];
      let rangeStart: (typeof sortedVersions)[0] | null = null;
      let prev: (typeof sortedVersions)[0] | null = null;

      for (let i = 0; i < sortedVersions.length; i++) {
        const current = sortedVersions[i];

        if (!prev) {
          rangeStart = current;
        } else {
          const isConsecutive =
            current.major === prev.major &&
            current.minor === prev.minor &&
            (current.patch === prev.patch + 1 || (current.patch === 0 && prev.patch === 0));

          if (!isConsecutive) {
            // Gap detected, close the current range
            if (rangeStart === prev) {
              result.push(rangeStart.version.replace(/\.0$/, ""));
            } else {
              result.push(`${rangeStart!.version.replace(/\.0$/, "")}-${prev.version.replace(/\.0$/, "")}`);
            }
            rangeStart = current;
          }
        }

        // Handle the last element
        if (i === sortedVersions.length - 1) {
          if (rangeStart === current) {
            result.push(current.version.replace(/\.0$/, ""));
          } else {
            result.push(`${rangeStart!.version.replace(/\.0$/, "")}-${current.version.replace(/\.0$/, "")}`);
          }
        }

        prev = current;
      }

      return result;
    })
    .flat()
    .sort((a, b) => {
      const getVersionNum = (str: string) => {
        const parts = str.split(/[-.]/)[0].split(".");
        return parseInt(parts[0]) * 1000000 + parseInt(parts[1]) * 1000 + parseInt(parts[2] || "0");
      };
      return getVersionNum(b) - getVersionNum(a);
    });
}

export function capitalize(str: string): string {
  return str.length == 1 ? str.toUpperCase() : str.charAt(0).toUpperCase() + str.slice(1);
}
