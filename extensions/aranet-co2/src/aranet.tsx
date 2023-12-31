import { Color, List } from "@raycast/api";
import useGetData from "./useGetData";

const getCO2Color = (co2: number) => {
  // < 1000 = Green
  // 1000 >= x > 1400 Yellow
  // >= 1400 Red
  if (co2 < 1000) {
    return Color.Green;
  } else if (co2 >= 1000 && co2 < 1400) {
    return Color.Yellow;
  } else {
    return Color.Red;
  }
};

export default function AranetCommand() {
  const data = useGetData();

  if (data == null) return <List isLoading={true} />;

  return (
    <List>
      <List.Item
        title="CO₂"
        subtitle="Carbon Dioxide"
        accessories={[{ tag: { value: data.co2.toString(), color: getCO2Color(data.co2) } }]}
      />
      <List.Item
        title="Temperature"
        accessories={[{ tag: { value: data.temperature.toString(), color: Color.PrimaryText } }]}
      />
      <List.Item
        title="Humidity"
        accessories={[{ tag: { value: data.humidity.toString(), color: Color.PrimaryText } }]}
      />
      <List.Item
        title="Pressure"
        accessories={[{ tag: { value: data.pressure.toString(), color: Color.PrimaryText } }]}
      />
    </List>
  );
}
