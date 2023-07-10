import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { isEmpty, isNull } from "lodash";

import { ChannelSchedule, TVSchedule } from "./modules/tv/domain/tvSchedule";
import ChannelDetails from "./components/ChannelDetails";
import { tvScheduleRepository } from "./modules/tv/repositories/tvScheduleRepository";

const Command = () => {
  const [tvSchedule, setTvSchedule] = useState<TVSchedule>([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>();

  useEffect(() => void tvScheduleRepository.getAll().then(setTvSchedule), []);

  const selectChannel = (channel: string | null) => {
    const channelSelected = !isNull(channel);
    if (channelSelected) setSelectedChannel(channel);
    setIsShowingDetail(channelSelected);
  };

  return (
    <List
      isLoading={isEmpty(tvSchedule)}
      selectedItemId={selectedChannel}
      isShowingDetail={isShowingDetail}
      onSelectionChange={selectChannel}
    >
      {tvSchedule.map(renderChannel)}
    </List>
  );
};

const renderChannel = ({ icon, name, schedule }: ChannelSchedule) => {
  const detail = <ChannelDetails icon={icon} name={name} schedule={schedule} />;
  return <List.Item key={name} title={name} icon={icon} detail={detail} />;
};

export default Command;
