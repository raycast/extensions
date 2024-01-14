import { Color, List, getPreferenceValues } from "@raycast/api";
import useGetData from "./useGetData";
import { checkAranetHomeInstallation } from "./utils";

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

type TemperatureType = "fahrenheit" | "celsius";

const tempConversion = (celsius: number, tempType: TemperatureType) => {
  if (tempType === "fahrenheit") {
    return Math.round((celsius * 9) / 5 + 32);
  } else {
    return celsius;
  }
};

export default function AranetCommand() {
  const data = useGetData();

  const tempType = getPreferenceValues<{
    temperature: TemperatureType;
  }>().temperature;

  checkAranetHomeInstallation();

  if (data == null) return <List isLoading={true} />;

  return (
    <List>
      <List.Item title="Device" accessories={[{ tag: { value: data.name, color: Color.PrimaryText } }]} />
      <List.Item
        title="CO₂"
        subtitle="Carbon Dioxide"
        accessories={[{ tag: { value: `${data.co2} ppm`, color: getCO2Color(data.co2) } }]}
      />
      <List.Item
        title="Temperature"
        accessories={[
          {
            tag: {
              value: `${tempConversion(data.temperature, tempType)} °${tempType == "celsius" ? "C" : "F"}`,
              color: Color.PrimaryText,
            },
          },
        ]}
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
