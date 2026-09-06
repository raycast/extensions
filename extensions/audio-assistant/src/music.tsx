import { SessionRoute } from "./ui/session";
import { MusicBrowser } from "./ui/music-browser";

export default function Music() {
  return (
    <SessionRoute>
      <MusicBrowser />
    </SessionRoute>
  );
}
