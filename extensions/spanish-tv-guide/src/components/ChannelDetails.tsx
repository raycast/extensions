import { Fragment } from "react";
import { Color, List } from "@raycast/api";

import { ChannelSchedule } from "../modules/tv/domain/tvSchedule";
import { getTime } from "../utils/dateUtils";

const { Item } = List;

const ChannelDetails = (channel: ChannelSchedule) => (
  <Item.Detail
    metadata={
      <Item.Detail.Metadata>
        <Item.Detail.Metadata.Label title={`${channel.name}`} icon={channel.icon} />
        <Item.Detail.Metadata.Separator />
        {channel.schedule.map((program, index) => (
          <Fragment key={index}>
            <Item.Detail.Metadata.Label
              title={program.description}
              text={{ value: getTime(program.startTime), color: Color.SecondaryText }}
            />
            <Item.Detail.Metadata.Separator />
          </Fragment>
        ))}
      </Item.Detail.Metadata>
    }
  />
);

export default ChannelDetails;
