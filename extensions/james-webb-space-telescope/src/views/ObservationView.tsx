import { Detail } from "@raycast/api";
import { Observation } from "../types";
import { getObservationIcon, isObservationImage } from "../helpers";

type ObservationViewProps = {
  observation: Observation;
};
export function ObservationView(props: ObservationViewProps) {
  const { observation } = props;

  return (
    <Detail
      markdown={`
# Observation ${observation.observation_id}

${observation.details.description}

${isObservationImage(observation) ? `![Image](${observation.location})` : ""}

      `}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Mission" text={observation.details.mission} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Instruments">
            {observation.details.instruments.map((instrument) => {
              return <Detail.Metadata.TagList.Item text={instrument.instrument} color={"#eed535"} />;
            })}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="File Type"
            text={observation.file_type}
            icon={getObservationIcon(observation)}
          />
          {observation.location && (
            <Detail.Metadata.Link title="File Link" target={observation.location} text={observation.location} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
