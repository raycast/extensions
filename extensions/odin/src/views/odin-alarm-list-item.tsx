import { Icon, List } from "@raycast/api";
import { OdinAlarmItemProps } from "../models/OdinAlarmItemProps";
import { ODIN_HTML_ALARM_DATE_FORMAT } from "../constants/OdinConstants";
import moment from "moment";

export function OdinAlarmListItem({ odinAlarmModel }: OdinAlarmItemProps) {
  const alarmReceivedFormatted = moment(odinAlarmModel.alarmModtaget, ODIN_HTML_ALARM_DATE_FORMAT, false)
    .startOf("hour")
    .fromNow();

  return (
    <List.Item
      title={odinAlarmModel.beredskab}
      subtitle={odinAlarmModel.station}
      keywords={[
        odinAlarmModel.beredskab,
        odinAlarmModel.station,
        odinAlarmModel.alarmModtaget,
        odinAlarmModel.foersteMeldingsOrdlyd,
      ]}
      key={odinAlarmModel.station}
      accessories={[
        { icon: Icon.QuoteBlock, text: odinAlarmModel.foersteMeldingsOrdlyd },
        { icon: Icon.Clock, text: alarmReceivedFormatted },
      ]}
    />
  );
}
