import { Icon, MenuBarExtra } from "@raycast/api";
import { IChild } from "./types";
import { getArrivals } from "./lib/api";
import useSWR from "swr";
import { getFavoriteStopPoints } from "./lib/points";

function Line({ child }: { child: IChild }) {
  const { data, error } = useSWR("arrivals-for-line", () => getArrivals(child.id));

  if (error) {
    return <MenuBarExtra.Item title="Error while loading arrival data" />;
  }

  return (
    <>
      {data &&
        data
          .filter((arrival) => arrival.disruption !== undefined)
          .map((arrival) => (
            <MenuBarExtra.Section title={arrival.disruption?.category}>
              {arrival.disruption?.affectedRoutes.map((route) => (
                <MenuBarExtra.Item title={route.name} />
              ))}
            </MenuBarExtra.Section>
          ))}
    </>
  );
}

function Lines({ children }: { children: IChild[] }) {
  return (
    <>
      {children.map((child) => (
        <Line child={child} key={child.id} />
      ))}
    </>
  );
}

export default function Command() {
  const { data: favoriteStopPoints } = useSWR("favorite-stop-points", () => getFavoriteStopPoints());

  return (
    <MenuBarExtra icon={Icon.Train} tooltip="Disruptions in your favorite stop points">
      {favoriteStopPoints &&
        favoriteStopPoints.map((stopPoint) => <Lines key={stopPoint.id} children={stopPoint.children} />)}

      <MenuBarExtra.Item title="You have no disruptions!" />
    </MenuBarExtra>
  );
}
