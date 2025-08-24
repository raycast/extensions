import { ActionPanel, List, Action, Toast, showToast, Color, Image, Icon } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { PAGE_SIZE, exportRoute, getRoutes, provider } from "./api/client";
import { useEffect } from "react";
import { SportType, StravaRoute } from "./api/types";
import { sportIcons, sportNames } from "./constants";
import { formatDistance, formatElevationGain, generateMapboxImage, saveFileToDesktop } from "./utils";

const routeTypeToSportType = {
  1: SportType.Ride,
  2: SportType.Run,
  3: SportType.Walk,
  4: SportType.Hike,
  5: SportType.TrailRun,
  6: SportType.GravelRide,
  7: SportType.MountainBikeRide,
};

export function Route({ route, isLoading }: { route: StravaRoute; isLoading: boolean }) {
  const formattedDistance = formatDistance(route.distance);
  const mapboxImage = generateMapboxImage(route.map.summary_polyline);
  const elevationGain = formatElevationGain(route.elevation_gain);
  const formattedMovingTime = new Date(route.estimated_moving_time * 1000).toISOString().substring(11, 19);
  const sportType = routeTypeToSportType[route.type as keyof typeof routeTypeToSportType] ?? SportType.Workout;
  const sportTypeName = sportNames[sportType];
  const stravaLink = `https://www.strava.com/routes/${route.id_str}/`;

  return (
    <List.Item
      title={route.name}
      accessories={[{ text: route.distance ? `${formattedDistance}` : undefined }]}
      icon={{
        source: sportIcons[sportType] || sportIcons["Workout"],
        tintColor: Color.PrimaryText,
      }}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={mapboxImage ? `![](${mapboxImage})` : undefined}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={route.name} />
              <List.Item.Detail.Metadata.Label title="Type" text={sportTypeName} />
              <List.Item.Detail.Metadata.Label
                title="Author"
                text={`${route.athlete.firstname} ${route.athlete.lastname}`}
                icon={{ source: route.athlete.profile_medium, mask: Image.Mask.Circle }}
              />
              <List.Item.Detail.Metadata.Separator />

              {route.distance ? <List.Item.Detail.Metadata.Label title="Distance" text={formattedDistance} /> : null}
              {route.elevation_gain ? (
                <List.Item.Detail.Metadata.Label title="Elevation Gain" text={elevationGain} />
              ) : null}
              {route.estimated_moving_time ? (
                <List.Item.Detail.Metadata.Label title="Estimated Moving Time" text={formattedMovingTime} />
              ) : null}

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created At" text={new Date(route.created_at).toLocaleString()} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Strava" url={stravaLink} />
          <Action.OpenInBrowser title="Edit Route" icon={Icon.Pencil} url={`${stravaLink}/edit`} />
          <Action.CopyToClipboard
            title="Copy Strava Link"
            content={stravaLink}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <ActionPanel.Section>
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Download GPX"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => {
                exportRoute(route.id_str, "gpx").then((fileStream) => saveFileToDesktop(route.name, "gpx", fileStream));
              }}
            />
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Download TCX"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => {
                exportRoute(route.id_str, "tcx").then((fileStream) => saveFileToDesktop(route.name, "tcx", fileStream));
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function Routes() {
  const {
    isLoading,
    data: routes,
    pagination,
    error,
  } = useCachedPromise(
    () => async (options: { page: number }) => {
      const newData = await getRoutes(options.page + 1, PAGE_SIZE);
      return { data: newData, hasMore: newData.length === PAGE_SIZE };
    },
    [],
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load routes",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List searchBarPlaceholder="Search routes" isLoading={isLoading} pagination={pagination} throttle isShowingDetail>
      {routes?.map((route) => <Route key={route.id} route={route} isLoading={isLoading} />)}
      {routes?.length === 0 && !isLoading && <List.EmptyView title="No routes found" />}
    </List>
  );
}

export default withAccessToken(provider)(Routes);
