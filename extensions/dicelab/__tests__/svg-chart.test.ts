// SVG chart generation tests

import {
  generatePMFBarChart,
  generateCombinedPMFBarChart,
  svgToDataUri,
} from "../src/utils/svg-chart";
import { buildCombinedChartData } from "../src/utils/chart-helpers";
import type { PMFData } from "../src/utils/pmf";

describe("generatePMFBarChart", () => {
  test("generates valid SVG", () => {
    const bins = [
      { label: "2", probability: 0.1 },
      { label: "3", probability: 0.2 },
    ];
    const svg = generatePMFBarChart(bins);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
  });

  test("handles empty bins", () => {
    const svg = generatePMFBarChart([]);
    expect(svg).toContain("No data");
  });

  test("includes title when provided", () => {
    const bins = [{ label: "1", probability: 1.0 }];
    const svg = generatePMFBarChart(bins, { title: "Test Chart" });
    expect(svg).toContain("Test Chart");
  });
});

describe("svgToDataUri", () => {
  test("converts SVG to data URI", () => {
    const svg = '<svg><rect/></svg>';
    const uri = svgToDataUri(svg);
    expect(uri).toMatch(/^data:image\/svg\+xml,/);
    expect(uri).toContain("svg");
  });
});

describe("generateCombinedPMFBarChart", () => {
  test("generates SVG with multiple datasets", () => {
    const chartData = {
      labels: ["1", "2", "3"],
      datasets: [
        {
          label: "Distribution #1",
          data: [0.5, 0.3, 0.2],
          backgroundColor: "rgba(80, 160, 255, 0.35)",
          borderColor: "rgba(80, 160, 255, 0.8)",
        },
        {
          label: "Distribution #2",
          data: [0.2, 0.5, 0.3],
          backgroundColor: "rgba(255, 99, 132, 0.35)",
          borderColor: "rgba(255, 99, 132, 0.8)",
        },
      ],
    };

    const svg = generateCombinedPMFBarChart(chartData, { showLegend: true });

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("Distribution #1");
    expect(svg).toContain("Distribution #2");
    expect(svg).toContain("<rect");
  });

  test("handles empty data", () => {
    const chartData = {
      labels: [],
      datasets: [],
    };

    const svg = generateCombinedPMFBarChart(chartData);
    expect(svg).toContain("No data");
  });

  test("includes title and legend when provided", () => {
    const chartData = {
      labels: ["1", "2"],
      datasets: [
        {
          label: "Test Distribution 1",
          data: [0.6, 0.4],
          backgroundColor: "rgba(80, 160, 255, 0.35)",
          borderColor: "rgba(80, 160, 255, 0.8)",
        },
        {
          label: "Test Distribution 2",
          data: [0.4, 0.6],
          backgroundColor: "rgba(255, 99, 132, 0.35)",
          borderColor: "rgba(255, 99, 132, 0.8)",
        },
      ],
    };

    const svg = generateCombinedPMFBarChart(chartData, {
      title: "Test Combined Chart",
      showLegend: true,
    });

    expect(svg).toContain("Test Combined Chart");
    expect(svg).toContain("Test Distribution 1");
    expect(svg).toContain("Test Distribution 2");
  });
});

describe("buildCombinedChartData", () => {
  test("combines multiple PMFs with aligned x-axis", () => {
    const pmf1: PMFData = {
      bins: [
        {
          label: "1",
          probability: 0.5,
          rawProbability: 0.5,
          rawValue: 1,
        },
        {
          label: "2",
          probability: 0.5,
          rawProbability: 0.5,
          rawValue: 2,
        },
      ],
      mean: 1.5,
      variance: 0.25,
      stdDev: 0.5,
      iqr: 1,
      quantiles: [],
      maxProbability: 0.5,
    };

    const pmf2: PMFData = {
      bins: [
        {
          label: "2",
          probability: 0.3,
          rawProbability: 0.3,
          rawValue: 2,
        },
        {
          label: "3",
          probability: 0.7,
          rawProbability: 0.7,
          rawValue: 3,
        },
      ],
      mean: 2.7,
      variance: 0.21,
      stdDev: 0.458,
      iqr: 1,
      quantiles: [],
      maxProbability: 0.7,
    };

    const chartData = buildCombinedChartData([pmf1, pmf2]);

    expect(chartData.labels).toEqual(["1", "2", "3"]);
    expect(chartData.datasets).toHaveLength(2);

    // PMF1: has 1 and 2, missing 3
    expect(chartData.datasets[0].data).toEqual([0.5, 0.5, 0]);

    // PMF2: missing 1, has 2 and 3
    expect(chartData.datasets[1].data).toEqual([0, 0.3, 0.7]);
  });

  test("sorts values numerically", () => {
    const pmf: PMFData = {
      bins: [
        {
          label: "10",
          probability: 0.3,
          rawProbability: 0.3,
          rawValue: 10,
        },
        {
          label: "2",
          probability: 0.7,
          rawProbability: 0.7,
          rawValue: 2,
        },
      ],
      mean: 4.6,
      variance: 16,
      stdDev: 4,
      iqr: 8,
      quantiles: [],
      maxProbability: 0.7,
    };

    const chartData = buildCombinedChartData([pmf]);
    expect(chartData.labels).toEqual(["2", "10"]); // Numeric sort
  });

  test("assigns colors to datasets", () => {
    const pmf: PMFData = {
      bins: [
        {
          label: "1",
          probability: 1.0,
          rawProbability: 1.0,
          rawValue: 1,
        },
      ],
      mean: 1,
      variance: 0,
      stdDev: 0,
      iqr: 0,
      quantiles: [],
      maxProbability: 1.0,
    };

    const chartData = buildCombinedChartData([pmf]);
    expect(chartData.datasets[0].label).toBe("Distribution #1");
    expect(chartData.datasets[0].backgroundColor).toBeDefined();
    expect(chartData.datasets[0].borderColor).toBeDefined();
  });
});
