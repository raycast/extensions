import { Form, LocalStorage } from "@raycast/api";
import { IIconConfig } from "@icon-park/svg/lib/runtime";
import { LocalStorageKey } from "../utils/constants";
import * as d3 from "d3-color";
import { MutatePromise } from "@raycast/utils";

export function FormMultiColor(props: { iconConfig: IIconConfig; mutate: MutatePromise<string | undefined> }) {
  const { iconConfig, mutate } = props;
  return (
    <>
      <Form.TextField
        id={"outStrokeColor"}
        title={"Out Stroke Color"}
        defaultValue={iconConfig.colors.multiColor.outStrokeColor}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.theme = "multi-color";
          config.colors.multiColor.outStrokeColor = d3.rgb(newValue.replaceAll(" ", "")).formatHex();
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      />
      <Form.TextField
        id={"outFillColor"}
        title={"Out Fill Color"}
        defaultValue={iconConfig.colors.multiColor.outFillColor}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.theme = "multi-color";
          config.colors.multiColor.outFillColor = d3.rgb(newValue.replaceAll(" ", "")).formatHex();
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      />
      <Form.TextField
        id={"innerStrokeColor"}
        title={"Inner Stroke Color"}
        defaultValue={iconConfig.colors.multiColor.innerStrokeColor}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.theme = "multi-color";
          config.colors.multiColor.innerStrokeColor = d3.rgb(newValue.replaceAll(" ", "")).formatHex();
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      />
      <Form.TextField
        id={"innerFillColor"}
        title={"Inner Fill Color"}
        defaultValue={iconConfig.colors.multiColor.innerFillColor}
        onChange={async (newValue) => {
          const config = { ...iconConfig };
          config.theme = "multi-color";
          config.colors.multiColor.innerFillColor = d3.rgb(newValue.replaceAll(" ", "")).formatHex();
          await LocalStorage.setItem(LocalStorageKey.ICON_CONFIG, JSON.stringify(config));
          await mutate();
        }}
      />
    </>
  );
}
