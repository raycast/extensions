import ProfileViewer from "./components/profile-viewer";
import { Game } from "./services/profileService";

export default function Command() {
  return <ProfileViewer game={Game.ETS2} />;
}
