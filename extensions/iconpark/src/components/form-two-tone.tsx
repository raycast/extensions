import { Form, LocalStorage } from "@raycast/api";
import { IIconConfig } from "@icon-park/svg/lib/runtime";
import { LocalStorageKey } from "../utils/constants";
import * as d3 from "d3-color";
import { Dispatch, SetStateAction } from "react";

export function FormTwoTone(props: { iconConfig: IIconConfig; setRefresh: Dispatch<SetStateAction<number>> }) {
  const { iconConfig, setRefresh } = props;
  return (
    <>
      <Form.TextField
        id={"outStrokeColor"}
        title={"Stroke Color"}
        defaultValue={iconConfig.colors.twoTone.fill}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.theme = "two-tone";
          config.colors.twoTone.fill = d3.rgb(newValue.replaceAll(" ", "")).formatHex();
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          setRefresh(Date.now());
        }}
      />
      <Form.TextField
        id={"outFillColor"}
        title={"Fill Color"}
        defaultValue={iconConfig.colors.twoTone.twoTone}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.theme = "two-tone";
          config.colors.twoTone.twoTone = d3.rgb(newValue.replaceAll(" ", "")).formatHex();
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          setRefresh(Date.now());
        }}
      />
    </>
  );
}
