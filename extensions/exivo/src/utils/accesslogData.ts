import { DateTime } from "luxon";
import { AccessLogItem, AccessLogItemData } from "../types/AccessLogItem";

export type AccessLogListItem = {
  id: string;
  title: string;
  subtitle: string;
  date: DateTime;
  data: AccessLogItemData;
};

export type ComponentGroupedAccessLog = { [key: string]: AccessLogListItem[] };

const getTitle = (logItem: AccessLogItem) => {
  return DateTime.fromISO(logItem.occurredAt).toFormat("cccc HH:mm:ss");
};

const getSubTitle = (logItem: AccessLogItem) => {
  return logItem.data.person
    ? `${logItem.data.person.firstName} ${logItem.data.person.lastName}`
    : logItem.data.apiIdentifier
      ? `API Access (${logItem.data.apiIdentifier})`
      : "Unknown";
};

export const groupByComponent = (accessLogs: AccessLogItem[]): ComponentGroupedAccessLog => {
  return accessLogs.reduce<{ [key: string]: AccessLogListItem[] }>((acc, item) => {
    const componentTitle = item.data.component.title;
    const listItem: AccessLogListItem = {
      id: item.id,
      title: getTitle(item),
      subtitle: getSubTitle(item),
      date: DateTime.fromISO(item.occurredAt),
      data: item.data,
    };

    if (!acc[componentTitle]) {
      acc[componentTitle] = [];
    }
    acc[componentTitle].push(listItem);

    return acc;
  }, {});
};
