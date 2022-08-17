import { Detail, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { Icon8, IconProps, Options } from "../types/types";
import { getIconDetail } from "../hooks/api";
import { getRandomColor, formatDate } from "../utils/utils";
import { IconActionPanel } from "./actions";
import json2md from "json2md";

export const IconDetail = (props: IconProps): JSX.Element => {
  const [icon, setIcon] = useState<Icon8>();
  const [options, setOptions] = useState<Options>(props.options);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchIcon = async () => {
      setIcon(await getIconDetail(props.icon, props.options));
      setIsLoading(false);
    };
    fetchIcon();
  }, []);

  useEffect(() => {
    props.setOptions(options);
  }, [options]);

  return (
    <Detail
      isLoading={isLoading}
      actions={<IconActionPanel props={{ ...props, options: options, setOptions: setOptions }} detailView={true} />}
      markdown={
        icon &&
        json2md([
          { h1: icon.name },
          { img: { source: icon.mdImage?.replace("$color", props.icon.isColor ? "" : `/${options.color.slice(1)}`) } },
        ])
      }
      metadata={
        icon && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Style" text={icon.style} />
            <Detail.Metadata.Label title="Category" text={icon.category} />
            <Detail.Metadata.TagList title="Tags">
              {icon.tags?.slice(0, 3).map((tag, index) => (
                <Detail.Metadata.TagList.Item key={index} text={tag} color={getRandomColor()} />
              ))}
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Type">
              {icon.isFree ? (
                <Detail.Metadata.TagList.Item text="Free" color={Color.Green} />
              ) : (
                <Detail.Metadata.TagList.Item text="Premium" color={Color.Orange} />
              )}
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Animated">
              {icon.isAnimated ? (
                <Detail.Metadata.TagList.Item text="True" color={Color.Orange} />
              ) : (
                <Detail.Metadata.TagList.Item text="False" color={Color.SecondaryText} />
              )}
            </Detail.Metadata.TagList>
            {icon.published && <Detail.Metadata.Label title="Published" text={formatDate(icon.published)} />}
            <Detail.Metadata.Link title="Open in Browser" target={icon.link} text={icon.name} />
          </Detail.Metadata>
        )
      }
    />
  );
};
