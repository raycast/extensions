import { useEffect, useState } from "react";
import { Trainrides } from "./types";
import { getTrainRides } from "./api";
import { LaunchProps, List } from "@raycast/api";

interface TrainrideArguments {
  from: string;
  to: string;
}

export default function TrainRide(props: LaunchProps<{ arguments: TrainrideArguments }>) {
  const { from, to } = props.arguments;
  const [trainrides, setTrainrides] = useState<Trainrides>();

  useEffect(() => {
    // add from and to to the api call
    getTrainRides(from, to).then((trainrides) => setTrainrides(trainrides));
  }, []);

  return (
    <>
      <List isLoading={!trainrides} isShowingDetail>
        <List.Section title={from + " -> " + to}>
          {trainrides?.connection?.map((trainride) => (
            <List.Item
              key={trainride.id}
              title={`${
                new Date(+trainride.departure.time * 1000).getHours() < 10
                  ? "0" + new Date(+trainride.departure.time * 1000).getHours()
                  : new Date(+trainride.departure.time * 1000).getHours()
              }:${
                new Date(+trainride.departure.time * 1000).getMinutes() < 10
                  ? "0" + new Date(+trainride.departure.time * 1000).getMinutes()
                  : new Date(+trainride.departure.time * 1000).getMinutes()
              } ${+trainride.departure.delay > 0 ? "(+" + +trainride.departure.delay / 60 + ")" : ""} - ${
                new Date(+trainride.arrival.time * 1000).getHours() < 10
                  ? "0" + new Date(+trainride.arrival.time * 1000).getHours()
                  : new Date(+trainride.arrival.time * 1000).getHours()
              }:${
                new Date(+trainride.arrival.time * 1000).getMinutes() < 10
                  ? "0" + new Date(+trainride.arrival.time * 1000).getMinutes()
                  : new Date(+trainride.arrival.time * 1000).getMinutes()
              } ${+trainride.arrival.delay > 0 ? "(+" + +trainride.arrival.delay / 60 + ")" : ""}`}
              subtitle={`platform: ${trainride.departure.platform}`}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Duration"
                        text={`${new Date(+trainride.duration * 1000).toISOString().slice(11, 16)}`}
                        icon="⏳"
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Departure" />
                      <List.Item.Detail.Metadata.Label
                        title="Station"
                        text={`${trainride.departure.station}, Platform ${trainride.departure.platform}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Time"
                        text={`${
                          new Date(+trainride.departure.time * 1000).getHours() < 10
                            ? "0" + new Date(+trainride.departure.time * 1000).getHours()
                            : new Date(+trainride.departure.time * 1000).getHours()
                        }:${
                          new Date(+trainride.departure.time * 1000).getMinutes() < 10
                            ? "0" + new Date(+trainride.departure.time * 1000).getMinutes()
                            : new Date(+trainride.departure.time * 1000).getMinutes()
                        } ${+trainride.departure.delay > 0 ? "(+" + +trainride.departure.delay / 60 + ")" : ""}`}
                        icon="⏰"
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Arrival" />
                      <List.Item.Detail.Metadata.Label
                        title="Station"
                        text={`${trainride.arrival.station}, Platform ${trainride.arrival.platform}`}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Time"
                        text={`${
                          new Date(+trainride.arrival.time * 1000).getHours() < 10
                            ? "0" + new Date(+trainride.arrival.time * 1000).getHours()
                            : new Date(+trainride.arrival.time * 1000).getHours()
                        }:${
                          new Date(+trainride.arrival.time * 1000).getMinutes() < 10
                            ? "0" + new Date(+trainride.arrival.time * 1000).getMinutes()
                            : new Date(+trainride.arrival.time * 1000).getMinutes()
                        } ${+trainride.arrival.delay > 0 ? "(+" + +trainride.arrival.delay / 60 + ")" : ""}`}
                        icon="⏰"
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Changes"
                        text={`${trainride.vias?.number ? trainride.vias?.number : "0"}`}
                      />
                      {trainride.vias?.via.map((via) => (
                        <List.Item.Detail.Metadata.Label
                          key={via.id}
                          title={`${via.station} (${new Date(+via.arrival.time * 1000)
                            .toISOString()
                            .slice(11, 16)} - ${new Date(+via.departure.time * 1000).toISOString().slice(11, 16)}) `}
                          text={`${via.arrival.platform} -> ${via.departure.platform}`}
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
        </List.Section>
      </List>
    </>
  );
}
