import { Detail } from "@raycast/api";

import { ChannelScheduleDto, ProgramDto, ProgramDetailsDto } from "../modules/tv/domain/tvScheduleDto";
import { getTime } from "../utils/dateUtils";
import { truncate } from "../utils/stringUtils";

export const SelectedProgram = (props: { channel: ChannelScheduleDto; program: ProgramDto & ProgramDetailsDto }) => {
  const { channel, program } = props;

  return (
    program && (
      <Detail
        navigationTitle={channel.name}
        markdown={formattedProgramDetails(program)}
        isLoading={!program}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title={channel.name} icon={channel.icon} />
            <Detail.Metadata.Label title={truncate(program.name)} />
          </Detail.Metadata>
        }
      />
    )
  );
};

type Props = ProgramDetailsDto & { name: string; startTime: Date };

const formattedProgramDetails = ({ name, startTime, imageUrl, description }: Props) => `
  ### ${getTime(startTime)} ${truncate(name)}
  
  --- 
  
  ${description}
  
  ![${truncate(name)}](${imageUrl})
  `;
