// Brand chart colors
const CHART_COLORS = {
  primary: "#d2f98b",
  secondary: "#35d5c5",
  third: "#0ea2ff",
  fourth: "#543dd8",
  fifth: "#ef88ff",
};

// Theme colors
const THEME_COLORS = {
  dark: {
    background: "rgb(30,30,30)",
    text: "#fff",
    grid: "rgba(255,255,255,0.1)",
  },
  light: {
    background: "rgb(255,255,255)",
    text: "#1e1e1e",
    grid: "rgba(0,0,0,0.1)",
  },
};

// Generate QuickChart bar chart URL
export const generateBarChartUrl = (
  labels: string[],
  values: number[],
  appearance: "dark" | "light" = "dark",
): string => {
  // Handle empty data
  if (!labels.length || !values.length || labels.length !== values.length) {
    labels = ["No data"];
    values = [0];
  }

  const colors = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.third,
    CHART_COLORS.fourth,
    CHART_COLORS.fifth,
  ];

  const chartConfig = {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Views",
          data: values,
          backgroundColor: labels.map((_, i) => colors[i % colors.length]),
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: THEME_COLORS[appearance].text },
          grid: { color: THEME_COLORS[appearance].grid },
        },
        y: {
          ticks: { color: THEME_COLORS[appearance].text },
          grid: { display: false },
        },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=540&height=270&backgroundColor=${THEME_COLORS[appearance].background}&devicePixelRatio=2&raycast-height=180`;
};

// Generate QuickChart pie/doughnut chart URL
export const generatePieChartUrl = (
  labels: string[],
  values: number[],
  appearance: "dark" | "light" = "dark",
): string => {
  // Handle empty data - ensure we have at least one value
  if (!labels.length || !values.length || labels.length !== values.length) {
    labels = ["No data"];
    values = [1];
  }

  const chartConfig = {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: THEME_COLORS[appearance].text,
            font: { size: 14 },
            padding: 15,
          },
        },
        datalabels: {
          color: appearance === "dark" ? "#1e1e1e" : "#fff",
          font: { size: 18, weight: "bold" },
          formatter: (value: number, context: { dataset: { data: number[] } }) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${percentage}%`;
          },
        },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=450&height=315&backgroundColor=${THEME_COLORS[appearance].background}&devicePixelRatio=2`;
};
