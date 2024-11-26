import { Fragment } from "react";
import { Color, Icon, List } from "@raycast/api";

import { ChannelScheduleDto, ProgramDto } from "../modules/tv/domain/tvScheduleDto";
import { getTime } from "../utils/dateUtils";
import { truncate } from "../utils/stringUtils";

const { Item } = List;

export const ChannelDetails = (channel: ChannelScheduleDto) => (
  <Item.Detail
    metadata={
      <Item.Detail.Metadata>
        <Item.Detail.Metadata.Label title={`${channel.name}`} icon={channel.icon} />
        <Item.Detail.Metadata.Separator />
        {channel.schedule.map((program, index) => (
          <Program key={index} program={program} />
        ))}
      </Item.Detail.Metadata>
    }
  />
);

const Program = ({ program }: { program: ProgramDto }) => {
  return (
    <Fragment>
      <Item.Detail.Metadata.Label
        title={truncate(program.name)}
        icon={program.isCurrentlyLive ? Icon.Clock : ""}
        text={{ value: getTime(program.startTime), color: Color.SecondaryText }}
      />
      <Item.Detail.Metadata.Separator />
    </Fragment>
  );
};
