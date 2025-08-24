import { MenuBarExtra } from "@raycast/api";
import { useFavorite } from "./hooks/use-favorite";
import { useVolume } from "./hooks/use-volume";

export default function Command() {
  const { favorites } = useFavorite("volume");
  const { volume, setVolume } = useVolume();

  return (
    <MenuBarExtra
      icon={{ source: "kef-icon.png" }}
      title={`${volume}%`}
      isLoading={volume === undefined}
      tooltip="Kef volume"
    >
      {favorites.map((favorite) => (
        <MenuBarExtra.Item key={favorite} title={`${favorite}%`} onAction={() => setVolume(favorite)} />
      ))}
    </MenuBarExtra>
  );
}
