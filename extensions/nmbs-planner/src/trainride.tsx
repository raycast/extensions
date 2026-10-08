import { useEffect, useState } from "react";
import { Trainrides, Vias, Via } from "@/types";
import { getTrainRides } from "@/utils/index";
import { LaunchProps, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface TrainrideArguments {
  from: string;
  to: string;
}

const pad2 = (n: number) => n.toString().padStart(2, "0");

function formatTime(ts: string | number, delay?: string | number) {
  const date = new Date(Number(ts) * 1000);
  const delayNum = Number(delay ?? 0);
  const delayText = delayNum > 0 ? `(+${Math.floor(delayNum / 60)})` : "";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())} ${delayText}`.trim();
}

function formatDuration(duration: string | number) {
  return new Date(Number(duration) * 1000).toISOString().slice(11, 16);
}

function renderViaLabels(vias?: Vias) {
  if (!vias?.via || !Array.isArray(vias.via)) return null;

  const fmt = (ts?: string | number, delay?: string | number) => {
    const n = Number(ts ?? NaN);
    if (!Number.isFinite(n)) return "—";
    return formatTime(n, delay);
  };

  return (
    <>
      {vias.via.map((via: Via) => (
        <List.Item.Detail.Metadata.Label
          key={via.id}
          title={`${via.station} (${fmt(via.arrival?.time, via.arrival?.delay)} - ${fmt(
            via.departure?.time,
            via.departure?.delay,
          )})`}
          text={`${via.arrival?.platform ?? "—"} -> ${via.departure?.platform ?? "—"}`}
        />
      ))}
    </>
  );
}

export default function TrainRide(props: LaunchProps<{ arguments: TrainrideArguments }>) {
  const { from, to } = props.arguments;
  const [trainrides, setTrainrides] = useState<Trainrides>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrainRides = async () => {
      try {
        setIsLoading(true);
        const tr = await getTrainRides(from, to);
        setTrainrides(tr);
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to fetch train rides",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrainRides();
  }, [from, to]);

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title={`${from} -> ${to}`}>
        {trainrides?.connection?.map((trainride) => {
          const dep = trainride.departure;
          const arr = trainride.arrival;

          return (
            <List.Item
              key={trainride.id}
              title={`${formatTime(dep.time, dep.delay)} - ${formatTime(arr.time, arr.delay)}`}
              subtitle={`platform: ${dep.platform}`}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Duration"
                        text={formatDuration(trainride.duration)}
                        icon="⏳"
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Departure" />
                      <List.Item.Detail.Metadata.Label
                        title="Station"
                        text={`${dep.station}, Platform ${dep.platform}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Time" text={formatTime(dep.time, dep.delay)} icon="⏰" />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Arrival" />
                      <List.Item.Detail.Metadata.Label
                        title="Station"
                        text={`${arr.station}, Platform ${arr.platform}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Time" text={formatTime(arr.time, arr.delay)} icon="⏰" />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Changes" text={`${trainride.vias?.number ?? 0}`} />
                      {renderViaLabels(trainride.vias)}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
