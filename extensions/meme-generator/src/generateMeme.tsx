import { imgflipApi } from "./api";
import MemeGrid from "./components/MemeGrid";

export default function Command() {
  return <MemeGrid apiModule={imgflipApi} />;
}
