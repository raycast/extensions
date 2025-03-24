import { ChartData } from "./useChart";
import { LineChart, Line, XAxis, YAxis } from "recharts";
import ReactDOMServer from "react-dom/server";

const getChartDataUrl = async (chart: ChartData) => {
  const isUp = chart[0].price < chart[chart.length - 1].price;
  const lineColor = isUp ? "#63fe7d" : "#FE6364";

  const formattedChart = chart.map((c) => ({
    time: new Date(c.timestamp).toLocaleTimeString(),
    price: c.price,
  }));

  const minPrice = Math.min(...chart.map((c) => c.price));
  const maxPrice = Math.max(...chart.map((c) => c.price));
  const padding = (maxPrice - minPrice) * 0.1;

  const svgChart = ReactDOMServer.renderToString(
    <svg width="800" height="300" xmlns="http://www.w3.org/2000/svg">
      <LineChart width={800} height={300} data={formattedChart}>
        <XAxis dataKey="time" hide />
        <YAxis domain={[minPrice - padding, maxPrice + padding]} hide />
        <Line type="monotone" dataKey="price" stroke={lineColor} strokeWidth={5} dot={false} />
      </LineChart>
    </svg>,
  );

  const base64Svg = Buffer.from(svgChart).toString("base64");
  return `data:image/svg+xml;base64,${base64Svg}`;
};

export default getChartDataUrl;
