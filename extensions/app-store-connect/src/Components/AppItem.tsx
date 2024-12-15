import { List, Image } from "@raycast/api";
import { App, buildSchemas } from "../Model/schemas";
import React, { useMemo } from "react";
import { useAppStoreConnectApi } from "../Hooks/useAppStoreConnect";

interface AppItemProps {
  id: string;
  app: App;
  title: string;
  subtitle?: string;
  accessories?: React.ComponentProps<typeof List.Item>["accessories"];
  actions: React.ReactNode;
}
export default function AppItem({ id, app, title, actions, subtitle, accessories }: AppItemProps) {
  const { data: builds } = useAppStoreConnectApi(
    `/builds?filter[app]=${app.id}&limit=1&sort=-uploadedDate`,
    (response) => {
      return buildSchemas.safeParse(response.data).data ?? null;
    },
  );

  const iconURL = useMemo(() => {
    if (builds === null) {
      return "";
    }
    if (builds.length === 0) {
      return "";
    }
    if (builds[0]?.attributes.iconAssetToken?.templateUrl) {
      const { templateUrl, width, height } = builds[0].attributes.iconAssetToken;
      const url = `${templateUrl
        .replace("{w}", width.toString())
        .replace("{h}", height.toString())
        .replace("{f}", "png")}`;
      return url;
    } else {
      return "";
    }
  }, [builds]);

  return (
    <List.Item
      id={id}
      icon={{
        source: iconURL,
        mask: Image.Mask.RoundedRectangle,
      }}
      title={title}
      subtitle={subtitle}
      accessories={accessories}
      actions={actions}
    />
  );
}
