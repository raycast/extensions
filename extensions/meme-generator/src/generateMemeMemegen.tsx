import MemeGrid from "./components/MemeGrid";
import { memegenApi } from "./api";

export default function Command() {
  return <MemeGrid apiModule={memegenApi} />;
}
