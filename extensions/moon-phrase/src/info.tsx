import { List } from "@raycast/api";
import StatsListItem from "./StatsListItem";
import { moon_phase } from "./helpers/MoonPhase";
import { getIllumination } from "./helpers/MoonIllumination";

const moon_emojis_north = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
// const moon_emojis_south = ["🌑", "🌘", "🌗", "🌖", "🌕", "🌔", "🌓", "🌒"]

const moon_phases = [
  "New Moon",
  "Waxing Crescent Moon",
  "Quarter Moon",
  "Waxing Gibbous Moon",
  "Full Moon",
  "Waning Gibbous Moon",
  "Last Quarter Moon",
  "Waning Crescent Moon",
];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Command() {
  const now = new Date();

  return (
    <List>
      <StatsListItem
        label="Current Time"
        value={`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${
          now.getHours() % 12
        }:${now.getMinutes()}${now.getHours() < 12 ? "am" : "pm"}`}
        icon={"🕓"}
      />
      <StatsListItem
        label="Moon Phase"
        value={moon_phases[Math.floor(moon_phase())]}
        icon={moon_emojis_north[Math.floor(moon_phase())]}
      />

      <StatsListItem
        label="Moon Status"
        value={`${(getIllumination(Date.now()) * 100).toFixed(1)}% Visible`}
        icon={"✨"}
      />
    </List>
  );
}
