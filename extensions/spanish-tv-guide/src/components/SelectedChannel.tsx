import { Dispatch, SetStateAction, useState } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";

import { ChannelScheduleDto, ProgramDto, upToDateChannelSchedule } from "../modules/tv/domain/tvScheduleDto";
import { getTime } from "../utils/dateUtils";
import { iconPath } from "../utils/iconUtils";
import { truncate } from "../utils/stringUtils";
import { SelectedProgram } from "./SelectedProgram";
import { tvScheduleRepository } from "../modules/tv/repositories/tvScheduleRepository";

type ProgramProps = {
  channel: ChannelScheduleDto;
  program: ProgramDto;
  index: number;
  onSelect: (index: number) => void;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

const SELECT_PROGRAM_ACTION = "Select Program";

export const SelectedChannel = ({ channel }: { channel: ChannelScheduleDto }) => {
  const schedule = upToDateChannelSchedule(channel.schedule);
  const currentLiveProgram = schedule.findIndex((program) => program.isCurrentlyLive);

  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number>(currentLiveProgram);
  const [loading, setLoading] = useState(false);

  return (
    <List selectedItemId={selectedProgramIndex.toString()} navigationTitle={channel.name} isLoading={loading}>
      <List.Section key={`channel-${channel.name}`}>
        <List.Item key={channel.name} title={`${channel.name}`} icon={iconPath(channel.icon)} />
      </List.Section>
      <List.Section key={`schedule-${channel.name}`}>
        {schedule.map((program, index) => (
          <Program
            key={index}
            channel={channel}
            program={program}
            index={index}
            onSelect={setSelectedProgramIndex}
            setLoading={setLoading}
          />
        ))}
      </List.Section>
    </List>
  );
};

const Program = ({ channel, program, index, onSelect: setSelectedProgramIndex, setLoading }: ProgramProps) => {
  const { push } = useNavigation();

  const handleSelectedProgram = () => {
    setLoading(true);

    tvScheduleRepository
      .getProgramDetails(program)
      .then((details) => push(<SelectedProgram channel={channel} program={{ ...program, ...details }} />))
      .then(() => setSelectedProgramIndex(index))
      .finally(() => setLoading(false));
  };

  const Actions = () => (
    <ActionPanel>
      <Action title={SELECT_PROGRAM_ACTION} icon={iconPath(channel.icon)} onAction={handleSelectedProgram} />
    </ActionPanel>
  );

  return (
    <List.Item
      key={index}
      id={index.toString()}
      title={`${getTime(program.startTime)} - ${truncate(program.name)}`}
      icon={program.isCurrentlyLive ? Icon.Clock : ""}
      actions={<Actions />}
    />
  );
};
