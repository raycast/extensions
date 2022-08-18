import { getRainRadars } from "./hooks/hooks";
import { RadarGridLayout } from "./components/radar-grid-layout";

export default function CommonDirectory() {
  const { radars, isLoading } = getRainRadars();

  return <RadarGridLayout isLoading={isLoading} radars={radars} />;
}
