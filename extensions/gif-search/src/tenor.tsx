import { GIF_SERVICE } from "./preferences";
import { GifSearch } from "./components/GifSearch";

import "./fetch-polyfill";

export default function Command() {
  return <GifSearch service={GIF_SERVICE.TENOR} />;
}
