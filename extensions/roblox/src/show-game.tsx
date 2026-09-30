import { Detail, type LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { GamePage } from "./components/game-page";

type Result = {
  universeId: number;
};

function NotFound() {
  return <Detail markdown={`# ⚠️ Invalid Input\nPlease enter a valid Place ID or Universe ID.`} />;
}

export default (props: LaunchProps<{ arguments: Arguments.ShowGame }>) => {
  const { placeId: enteredPlaceId, universeId: enteredUniverseId } = props.arguments;

  const placeId = Number(enteredPlaceId);
  const universeId = Number(enteredUniverseId);

  if (!placeId && !universeId) {
    return <NotFound />;
  }

  if (universeId) {
    return <GamePage universeId={universeId} />;
  }

  const { data, isLoading } = useFetch<Result>(
    `https://apis.roblox.com/universes/v1/places/${enteredPlaceId}/universe`,
  );

  if (isLoading) {
    return <Detail isLoading={isLoading} markdown={"Loading..."} />;
  }

  if (!data?.universeId) {
    return <NotFound />;
  }

  const { universeId: foundUniverseId } = data;
  return <GamePage universeId={foundUniverseId} />;
};
