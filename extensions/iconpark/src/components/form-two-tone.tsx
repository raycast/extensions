import { Form, LocalStorage } from "@raycast/api";
import { IIconConfig } from "@icon-park/svg/lib/runtime";
import { LocalStorageKey } from "../utils/constants";
import * as d3 from "d3-color";
import { MutatePromise } from "@raycast/utils";

export function FormTwoTone(props: { iconConfig: IIconConfig; mutate: MutatePromise<string | undefined> }) {
  const { iconConfig, mutate } = props;
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
          await mutate();
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
          await mutate();
        }}
      />
    </>
  );
}
