import { LocalStorage, Toast, showToast } from "@raycast/api";
import { IStopPoint } from "../types";

export async function getFavoriteStopPoints(): Promise<IStopPoint[]> {
  try {
    const _points = await LocalStorage.getItem<string>("favourite_stop_points");

    if (_points) {
      return JSON.parse(_points);
    }
  } catch (error) {
    // Not showing toast because this error doesn't need to shown to the user.
    console.info("No favourite stop points");
  }

  return [];
}

export async function addStopPointToFavorites(stopPoint: IStopPoint): Promise<void> {
  try {
    const points = await getFavoriteStopPoints();

    if (points.find((p) => p.id === stopPoint.id)) {
      return;
    }

    points.push(stopPoint);

    await LocalStorage.setItem("favourite_stop_points", JSON.stringify(points));

    showToast({
      title: `Added ${stopPoint.commonName} to favorite stop points`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    showToast({
      title: "Failed to add to favorite stop points",
      style: Toast.Style.Failure,
    });
  }
}

export async function removeStopPointFromFavorites(stopPoint: IStopPoint): Promise<void> {
  try {
    const points = await getFavoriteStopPoints();

    const index = points.findIndex((p) => p.id === stopPoint.id);

    if (index === -1) {
      return;
    }

    points.splice(index, 1);

    await LocalStorage.setItem("favourite_stop_points", JSON.stringify(points));

    showToast({
      title: `Removed ${stopPoint.commonName} from favorite stop points`,
      style: Toast.Style.Success,
    });
  } catch (error) {
    showToast({
      title: "Failed to remove from favorite stop points",
      style: Toast.Style.Failure,
    });
  }
}
