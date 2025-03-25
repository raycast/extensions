import axios from "axios";
import * as Cheerio from "cheerio";
import * as crypto from "crypto";
import {
  ODIN_HTML_ALARM_UPDATED_AT_REGEX,
  ODIN_HTML_ALARMS_TABLE_BODY_CLASS,
  ODIN_HTML_ALARMS_TABLE_ID,
  ODIN_SOURCE_URL,
} from "../constants/OdinConstants";
import { OdinAlarm } from "../models/OdinAlarm";

export default class OdinHelper {
  retrieveAlarmsFromOdinPuls = async () => {
    try {
      const response = await axios({
        method: "get",
        url: ODIN_SOURCE_URL,
      });

      const content = await response.data;

      return this.parseOdinAlarms(content);
    } catch (error) {
      console.error(error);
    }
  };

  parseOdinAlarms = async (html: string): Promise<[OdinAlarm[], string | undefined]> => {
    const alarms: OdinAlarm[] = [];

    const $ = Cheerio.load(html);

    const lastUpdated = $("#CurrentTime").last().text();
    const matchedRegexLastUpdated = lastUpdated.match(ODIN_HTML_ALARM_UPDATED_AT_REGEX)?.toString();

    const alarmsTable = $(`#${ODIN_HTML_ALARMS_TABLE_ID}`).first();
    const alarmsTableBody = alarmsTable.find(ODIN_HTML_ALARMS_TABLE_BODY_CLASS);

    alarmsTableBody.children().each((i, tableRowElement) => {
      const tableRowElementChildren = $(tableRowElement).first().children();
      const tableRowElementChildrenFilter = $(tableRowElement).first().find("th");

      if (tableRowElementChildrenFilter.length === 0) {
        const beredskabElement = $(tableRowElementChildren)[0];
        const stationElement = $(tableRowElementChildren)[1];
        const alarmModtagetELement = $(tableRowElementChildren)[2];
        const foersteMeldingsOrdlydElement = $(tableRowElementChildren)[3];

        const beredskab = $(beredskabElement).text().trim();
        const station = $(stationElement).text().trim();
        const alarmModtaget = $(alarmModtagetELement).text().trim();
        const foersteMeldingsOrdlyd = $(foersteMeldingsOrdlydElement).text().trim();

        const alarm: OdinAlarm = {
          beredskab: beredskab,
          station: station,
          alarmModtaget: alarmModtaget,
          foersteMeldingsOrdlyd: foersteMeldingsOrdlyd,
        };

        alarms.push(alarm);
      }
    });

    return [alarms, matchedRegexLastUpdated];
  };

  generateRandomUUID = (): string => {
    return crypto.randomUUID();
  };

  didFindAlarms = (array: [OdinAlarm] | null): null | boolean => {
    return array && array?.length > 0;
  };
}
