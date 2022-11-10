import { useCallback, useEffect, useState } from "react";
import { setConfig, Home as iconParkHome } from "@icon-park/svg";
import * as fs from "fs";
import { environment, LocalStorage } from "@raycast/api";
import { IconInfo } from "../types/types";
import { configDefault, LocalStorageKey } from "../utils/constants";
import { IIconConfig } from "@icon-park/svg/lib/runtime";

export const getIconInfos = () => {
  const [iconInfos, setIconInfos] = useState<IconInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const data = fs.readFileSync(environment.assetsPath + "/icons.json", "utf8");

      const _iconInfos: IconInfo[] = JSON.parse(data);
      iconParkHome({ theme: "multi-color" });
      setIconInfos(_iconInfos);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { iconInfos, iconLoading: loading };
};

export const getIconConfig = (refresh: number) => {
  const [iconConfig, setIconConfig] = useState<IIconConfig>(configDefault);
  const [iconBase, setIconBase] = useState<string>(JSON.stringify(configDefault));
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const localstorage = await LocalStorage.getItem<string>(LocalStorageKey.ICON_CONFIG);
    if (typeof localstorage !== "undefined") {
      setIconConfig(JSON.parse(localstorage));
      const iiconConfig: IIconConfig = JSON.parse(localstorage);

      const fillColor: string[] = [];
      switch (iiconConfig.theme) {
        case "outline": {
          fillColor.push(iiconConfig.colors.outline.fill);
          fillColor.push(iiconConfig.colors.outline.background);
          break;
        }
        case "filled": {
          fillColor.push(iiconConfig.colors.filled.fill);
          fillColor.push(iiconConfig.colors.filled.background);
          break;
        }
        case "two-tone": {
          fillColor.push(iiconConfig.colors.twoTone.fill);
          fillColor.push(iiconConfig.colors.twoTone.twoTone);
          break;
        }
        case "multi-color": {
          fillColor.push(iiconConfig.colors.multiColor.outStrokeColor);
          break;
        }
      }

      setIconBase(
        JSON.stringify({
          size: iiconConfig.size,
          strokeWidth: iiconConfig.strokeWidth,
          strokeLinecap: iiconConfig.strokeLinecap,
          strokeLinejoin: iiconConfig.strokeLinejoin,
          theme: iiconConfig.theme,
          fill: fillColor,
        })
      );
      setConfig(iiconConfig);
    } else {
      setIconBase(
        JSON.stringify({
          size: configDefault.size,
          strokeWidth: configDefault.strokeWidth,
          strokeLinecap: configDefault.strokeLinecap,
          strokeLinejoin: configDefault.strokeLinejoin,
          theme: configDefault.theme,
          fill: configDefault.colors.outline.fill,
        })
      );
      setConfig(configDefault);
    }
    setLoading(false);
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { iconConfig, iconBase, configLoading: loading };
};
