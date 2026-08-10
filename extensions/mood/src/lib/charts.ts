import { Mood, MOOD_VALUES, MoodEntry, getMoodTitle } from "./data";

// Convert SVG string to base64 data URL
function svgToBase64(svgString: string): string {
  // Remove line breaks and extra spaces to create a compact SVG
  const compactSvg = svgString.replace(/\s+/g, " ").trim();

  const base64 = Buffer.from(compactSvg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

// Generate SVG for a sparkline chart
export function generateSparkline(entries: MoodEntry[], width = 600, height = 300) {
  if (entries.length === 0) return "";

  // Margin for labels
  const bottomMargin = 25;
  const chartHeight = height - bottomMargin;

  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const values = sortedEntries.map((entry) => MOOD_VALUES[entry.mood] || 4);

  const min = 1;
  const max = 7;
  const range = max - min;

  // Calculate points for sparkline
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = chartHeight * (1 - (value - min) / range);
    return [x, y];
  });

  // Calculate where the neutral line should be (4 on our scale)
  const neutralY = chartHeight * (1 - (4 - min) / range);

  // X-axis labels (first and last date)
  const xAxisLabels = `
      <text 
        x="0" 
        y="${chartHeight + 15}" 
        text-anchor="start" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="10" 
        fill="#888888"
      >${new Date(sortedEntries[0].date).toLocaleDateString()}</text>
      <text 
        x="${width}" 
        y="${chartHeight + 15}" 
        text-anchor="end" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-size="10" 
        fill="#888888"
      >${new Date(sortedEntries[sortedEntries.length - 1].date).toLocaleDateString()}</text>
    `;

  const neutralLine = `
      <line 
        x1="0" 
        y1="${neutralY}" 
        x2="${width}" 
        y2="${neutralY}" 
        stroke="#CCCCCC" 
        stroke-width="1" 
        stroke-dasharray="4,4"
      />
    `;

  const sparkline = `
      <polyline
        points="${points.map(([x, y]) => `${x},${y}`).join(" ")}"
        fill="none"
        stroke="#007AFF"
        stroke-width="2"
      />
    `;

  const circles = points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#007AFF" />`).join("");

  return svgToBase64(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${neutralLine}
        ${xAxisLabels}
        ${sparkline}
        ${circles}
      </svg>
    `);
}

// Generate mood distribution chart (simple bar chart)
export function generateMoodDistribution(entries: MoodEntry[], width = 600, height = 300) {
  if (entries.length === 0) return "";

  // Count occurrences of each mood
  const moodCounts: Partial<Record<Mood, number>> = {};
  entries.forEach((entry) => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });

  const moodColors: Record<Mood, string> = {
    happy: "#FFD700", // Gold
    excited: "#FF4500", // OrangeRed
    content: "#32CD32", // LimeGreen
    neutral: "#A9A9A9", // DarkGray
    frustrated: "#DC143C", // Crimson
    sad: "#4682B4", // SteelBlue
    anxious: "#9932CC", // DarkOrchid
  };

  // Sort moods by value
  const sortedMoods = (Object.keys(moodCounts) as Mood[]).sort((a, b) => MOOD_VALUES[b] - MOOD_VALUES[a]);
  const maxCount = Math.max(...Object.values(moodCounts));

  // Margins for labels
  const margin = { top: 15, bottom: 35 };
  const chartHeight = height - margin.top - margin.bottom;

  const barWidth = width / (sortedMoods.length || 1);
  const bars = sortedMoods
    .map((mood, index) => {
      const barHeight = ((moodCounts[mood] || 0) / maxCount) * chartHeight;
      const x = index * barWidth;
      const y = margin.top + chartHeight - barHeight;

      return `
        <g>
          <rect 
            x="${x + 2.5}" 
            y="${y}" 
            width="${barWidth - 2.5}" 
            height="${barHeight}" 
            fill="${moodColors[mood] || "#007AFF"}" 
          />
          <text 
            x="${x + barWidth / 2}" 
            y="${margin.top + chartHeight + 15}" 
            text-anchor="middle" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="12"
          >
            ${getMoodTitle(mood)}
          </text>
          <text 
            x="${x + barWidth / 2}" 
            y="${y - 5}" 
            text-anchor="middle" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-size="10"
          >
            ${moodCounts[mood]}
          </text>
        </g>
      `;
    })
    .join("");

  const xAxis = `
      <line 
        x1="0" 
        y1="${margin.top + chartHeight}" 
        x2="${width}" 
        y2="${margin.top + chartHeight}" 
        stroke="#CCCCCC" 
        stroke-width="1"
      />
    `;

  return svgToBase64(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${xAxis}
        ${bars}
      </svg>
    `);
}
