import React from "react";
import { Action, ActionPanel, List, useNavigation } from "@raycast/api";

import { State } from "../index";
import { ChannelScheduleDto, TvScheduleDto, upToDateChannelSchedule } from "../modules/tv/domain/tvScheduleDto";
import { ChannelDetails } from "./ChannelDetails";
import { SelectedChannel } from "./SelectedChannel";
import { iconPath } from "../utils/iconUtils";
import { isEmpty, isNull } from "../utils/objectUtils";
import { toId } from "../utils/stringUtils";

const SELECT_CHANNEL_ACTION = "Select Channel";

export const ChannelList = ({ state, setState }: { state: State; setState: React.Dispatch<Partial<State>> }) => {
  const { tvSchedule, selectedChannel } = state;

  const selectChannel = (channel: string | null) => {
    const selectedChannel = !isNull(channel);
    if (selectedChannel) setState({ selectedChannel: channel });
  };

  return (
    <List
      selectedItemId={selectedChannel}
      isLoading={isEmpty(tvSchedule)}
      onSelectionChange={selectChannel}
      isShowingDetail={Boolean(state.selectedChannel)}
    >
      {tvSchedule.map((schedule) => (
        <Channel key={schedule.name} tvSchedule={state.tvSchedule} channelSchedule={schedule} />
      ))}
    </List>
  );
};

const Channel = (props: { tvSchedule: TvScheduleDto; channelSchedule: ChannelScheduleDto }) => {
  const { push } = useNavigation();
  const { icon, name, schedule } = props.channelSchedule;
  const selectedChannel = props.tvSchedule.find((channel) => channel.name === name);

  const Actions = () => (
    <ActionPanel>
      <Action
        title={SELECT_CHANNEL_ACTION}
        icon={iconPath(icon)}
        onAction={() => selectedChannel && push(<SelectedChannel channel={selectedChannel} />)}
      />
    </ActionPanel>
  );

  return (
    <List.Item
      key={name}
      id={toId(name)}
      title={name}
      icon={iconPath(icon)}
      detail={<ChannelDetails name={name} schedule={upToDateChannelSchedule(schedule)} icon={icon} />}
      actions={<Actions />}
    />
  );
};
