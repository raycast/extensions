import ChartJsImage from "chartjs-to-image";
import { ChartData } from "./useChart";

const getChartDataUrl = async (chart: ChartData) => {
  const myChart = new ChartJsImage();
  const options = {
    animation: {
      duration: 0,
    },
    responsive: false,
    maintainAspectRatio: false,
    elements: {
      line: {
        capBezierPoints: false,
      },
    },
    plugins: {
      filler: {
        propagate: true,
      },
      colors: {
        enabled: true,
      },
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        display: false,
        ticks: {
          color: "#E7E7E7",
          fontSize: 12,
          fontWeight: 400,
        },
      },
      y: {
        position: "left",
        display: false,
        grid: {
          display: false,
        },
        ticks: {
          color: "#E7E7E7",
          fontSize: 12,
          fontWeight: 400,
        },
      },
    },
  };
  myChart.setChartJsVersion("4.3.3");
  myChart.setFormat("svg");
  myChart.setBackgroundColor("transparent");
  myChart.setHeight(200);
  const isUp = chart.length > 0 ? chart[0].price < chart[chart.length - 1].price : false;
  myChart.setConfig({
    type: "line",
    data: {
      labels: chart.map((c) => new Date(c.timestamp).toLocaleString()),
      datasets: [
        {
          label: "Price",
          data: chart.map((c) => c.price),
          fill: false,
          borderColor: isUp ? "#63fe7d" : "#FE6364",
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    },
    options,
  });
  return myChart.toDataUrl();
};

export default getChartDataUrl;
