import { popToRoot, Detail, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

export default function AnalyzePackage(props) {
  const { packageName } = props.arguments;

  const [markdown, setMarkdown] = useState("Loading data from Bundlephobia...");

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + "B";
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + "kB";
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + "mB";
    } else if (bytes < 1024 * 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + "gB";
    } else {
      return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1) + " tB";
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`https://bundlephobia.com/api/size?package=${packageName}`, {
          headers: { "User-Agent": "bundle-phobia-cli", "X-Bundlephobia-User": "bundle-phobia-cli" },
        }).then((response) => response.json());

        // SIZES
        let gzipSize = res.gzip;
        let minifiedSize = res.size;

        // DEPENDENCY INFORMATION
        let dependencyCount = res.dependencyCount;
        // Remove self, and sort by highest ranking
        let dependencies = res.dependencySizes
          .filter((list) => {
            if (list.name === packageName) dependencyCount--;
            return list.name !== packageName;
          })
          .sort((a, b) => b.approximateSize - a.approximateSize);

        // REPO INFORMATION
        let description = res.description;
        let githubLink = res.repository.slice(0, -4);
        let version = res.version;

        let convertSecondsToFormattedTime = (seconds) => {
          if (seconds < 1) {
            var milliseconds = Math.round(seconds * 1000);
            return milliseconds + "ms";
          } else {
            var formattedSeconds = seconds.toFixed(2);
            return formattedSeconds + "s";
          }
        };

        let newMarkdown = `
# Analysis of \`${packageName.includes("@") ? packageName : packageName + "@" + version}\`
> ${description}
    
[GitHub](${githubLink}) | [NPM](https://www.npmjs.com/package/${packageName}) | [Bundlephobia](https://bundlephobia.com/package/${packageName})
    
## Bundle Size
| **Minified** | **Minified + GZIP** (Minzipped) |
|----------|-----------------|
| ${formatBytes(minifiedSize)}  | ${formatBytes(gzipSize)}         |
    
## Download Time (For Minzipped)
|**Download Time on Slow 3G** (50kB/s) | **Download Time on Emerging 4G**  (875kB/s)  |
|-------------------------|------------------------------|
| ${convertSecondsToFormattedTime(gzipSize / 50 / 1000)}| ${convertSecondsToFormattedTime(
          gzipSize / 875 / 1000
        )}                        |
    `;

        if (dependencyCount === 0) {
          newMarkdown += `
# Dependencies
💨 \`${packageName}\` has no dependencies!`;
        } else {
          newMarkdown += `
# Dependencies
| Dependency | Size | % of Minified Size ${formatBytes(minifiedSize)})|
|------------|---------|---------------------------------------------------|`;

          for (let depJSON of dependencies) {
            newMarkdown += `
| \`${depJSON.name}\` | ${formatBytes(depJSON.approximateSize)} | ~${
              Math.round((depJSON.approximateSize / minifiedSize) * 100 * 10) / 10
            }% |`;
          }
        }

        setMarkdown(newMarkdown);
      } catch {
        popToRoot();
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch library.",
        });
      }
    })();
  });
  return <Detail loading={markdown === "Loading data from Bundlephobia..."} markdown={markdown} />;
}
