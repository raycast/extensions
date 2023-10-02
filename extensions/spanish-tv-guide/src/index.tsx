import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import Jimp from "jimp";
import { isEmpty, isNull } from "lodash";

import { ChannelSchedule, TVSchedule } from "./modules/tv/domain/tvSchedule";
import ChannelDetails from "./components/ChannelDetails";
import { tvScheduleRepository } from "./modules/tv/repositories/tvScheduleRepository";

const ICONS_DIRECTORY = "/tmp/raycast/spanish-tv-guide/icons";

const Command = () => {
  const [tvSchedule, setTvSchedule] = useState<TVSchedule>([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>();

  useEffect(() => void tvScheduleRepository.getAll().then(setTvSchedule), []);
  useEffect(() => void generateIcons(tvSchedule).then(() => setIconsLoaded(true)), [tvSchedule]);

  const selectChannel = (channel: string | null) => {
    const channelSelected = !isNull(channel);
    if (channelSelected) setSelectedChannel(channel);
    setIsShowingDetail(channelSelected);
  };

  return (
    <List
      isLoading={isEmpty(tvSchedule) || !iconsLoaded}
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
  return <List.Item key={name} title={name} icon={iconPath(icon)} detail={detail} />;
};

const generateIcons = (tvSchedule: TVSchedule) => Promise.all(tvSchedule.map(({ icon }) => generateIcon(icon)));
const generateIcon = (icon: string) => Jimp.read(icon).then((image) => image.contain(256, 256).write(iconPath(icon)));
const iconPath = (icon: string) => `${ICONS_DIRECTORY}/${iconName(icon)}`;
const iconName = (icon: string) => icon.substring(icon.lastIndexOf("/") + 1);

export default Command;
