import { Action, popToRoot } from "@raycast/api";
import { isCapacitiesInstalled } from "../helpers/isCapacitiesInstalled";

type OpenInCapacitiesProps = {
  target: string;
  title?: string;
};

export default function OpenInCapacities({ title, target }: OpenInCapacitiesProps) {
  return (
    <>
      {isCapacitiesInstalled && (
        <Action.Open
          title={`${title ? title : "Open"} in Capacities`}
          icon="capacities.png"
          target={`capacities://${target}`}
          application="Capacities"
          onOpen={() => {
            popToRoot();
          }}
        />
      )}
      <Action.OpenInBrowser
        url={`https://app.capacities.io/${target}`}
        title={`${title ? title : "Open"} in Browser`}
        onOpen={() => {
          popToRoot();
        }}
      />
    </>
  );
}
