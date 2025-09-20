import { Color, Icon, List } from "@raycast/api";
import { icons } from "../lib/speedtest-pretty-names";
import {
  SpeedtestResult,
  SpeedtestResultKeys,
  SpeedtestResultObjectValueType,
  SpeedtestResultValueType,
} from "../lib/speedtest.types";
import { getPrettyName, getPrettyValue, isObject, isResultViewIconsListKey } from "../lib/utils";
import { InternetSpeed } from "./bandwidth/types";

type MetadataValue = SpeedtestResultObjectValueType | Partial<SpeedtestResult> | InternetSpeed;

type ListItemMetadataProps = {
  data: MetadataValue;
  type?: "result";
};

type FlatMetadata = {
  title: string;
  value: string;
  icon?: { source: Icon; tintColor: Color };
  isSeparator?: boolean;
};

const getFlatMetadata = (data: MetadataValue): FlatMetadata[] => {
  const items: FlatMetadata[] = [];

  Object.entries(data).forEach((keyValuePair, index) => {
    const [key, value] = keyValuePair as [SpeedtestResultKeys, SpeedtestResultValueType];
    if (isObject(value)) {
      if (index > 0) {
        const separatorItem: FlatMetadata = {
          isSeparator: true,
          title: "",
          value: "",
        };
        items.push(separatorItem);
      }

      const titleItem: FlatMetadata = { title: getPrettyName(key), value: "" };
      if (isResultViewIconsListKey(key)) {
        titleItem.icon = icons[key];
      }
      items.push(titleItem);

      items.push(...getFlatMetadata(value));
      return;
    }

    items.push({
      title: getPrettyName(key),
      value: getPrettyValue(value),
    });
  });

  return items;
};

const reorderResult = (data: SpeedtestResult): Partial<SpeedtestResult> => {
  const { interface: isp, server, ping, download, upload, result } = data;
  return {
    interface: isp,
    server,
    ping,
    download,
    upload,
    result,
  };
};

export const ListItemMetadata = ({ data, type }: ListItemMetadataProps) => {
  let renderData = data;
  if (type === "result") {
    renderData = reorderResult(data as SpeedtestResult);
  }
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {getFlatMetadata(renderData).map((el, i) =>
            el.isSeparator ? (
              <List.Item.Detail.Metadata.Separator key={i} />
            ) : (
              <List.Item.Detail.Metadata.Label icon={el.icon} title={el.title} key={i} text={el.value} />
            ),
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};
