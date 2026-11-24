import { MovedToDesktopView } from "./views/MovedToDesktopView";

// The browser bookmark importer moved to the 1bookmark Desktop app. The command is kept so that
// users who relied on it are guided there instead of finding it gone.
export default function Command() {
  return (
    <MovedToDesktopView
      title="Import Bookmarks"
      lead="Bookmarks are imported from your browsers in the 1bookmark Desktop app."
    />
  );
}
