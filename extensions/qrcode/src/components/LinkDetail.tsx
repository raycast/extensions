import { List, Icon } from "@raycast/api";
import { LinkItem } from "../types";
import { parseURL } from "../utils";
import { useTranslation } from "../i18n";
import { useMemo } from "react";

interface LinkDetailProps {
  link: LinkItem;
  selectedLink: string;
  qrCodeUrl: string;
  showMetadata: boolean;
}

export function LinkDetail({ link, selectedLink, qrCodeUrl, showMetadata }: LinkDetailProps) {
  const t = useTranslation();

  const urlInfo = useMemo(() => {
    return parseURL(link.url);
  }, [link.url]);

  return (
    <List.Item.Detail
      markdown={
        selectedLink === link.url ? (qrCodeUrl ? `![QR Code](${qrCodeUrl})` : t.generateFailed) : t.generateQRCode
      }
      metadata={
        showMetadata ? (
          <List.Item.Detail.Metadata>
            {link.title && link.title !== link.url && (
              <List.Item.Detail.Metadata.Label title={t.description} text={link.title} icon={Icon.Tag} />
            )}
            {urlInfo && <List.Item.Detail.Metadata.Separator />}
            {urlInfo?.protocol && (
              <List.Item.Detail.Metadata.TagList title={t.protocol}>
                <List.Item.Detail.Metadata.TagList.Item
                  text={urlInfo.protocol.replace(":", "")}
                  icon={Icon.Lock}
                  color="#bb9af7"
                />
              </List.Item.Detail.Metadata.TagList>
            )}
            {urlInfo?.host && (
              <List.Item.Detail.Metadata.TagList title={t.domain}>
                <List.Item.Detail.Metadata.TagList.Item text={urlInfo.host} icon={Icon.Globe} color={"#2ac3de"} />
              </List.Item.Detail.Metadata.TagList>
            )}
            {urlInfo?.path && urlInfo.path !== "/" && (
              <List.Item.Detail.Metadata.TagList title={t.path}>
                <List.Item.Detail.Metadata.TagList.Item text={urlInfo.path} icon={Icon.Code} color="#ff9e64" />
              </List.Item.Detail.Metadata.TagList>
            )}
            {urlInfo?.query && (
              <List.Item.Detail.Metadata.TagList title={t.queryParams}>
                {urlInfo.query
                  .substring(1)
                  .split("&")
                  .map((param, index) => {
                    const [key, value] = param.split("=");
                    return (
                      key && (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={index}
                          text={`${key}${value ? `=${value}` : ""}`}
                          icon={Icon.Filter}
                          color="#f0fff0"
                        />
                      )
                    );
                  })}
              </List.Item.Detail.Metadata.TagList>
            )}
          </List.Item.Detail.Metadata>
        ) : null
      }
    />
  );
}
