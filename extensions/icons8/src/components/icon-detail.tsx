import { Detail, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { Icon8 } from "../types/types";
import { getIconDetail } from "../hooks/api";
import { getRandomColor, formatDate } from "../utils/utils";

export const IconDetail = (props: { icon: Icon8 }): JSX.Element => {
  const [icon, setIcon] = useState<Icon8>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchIcon = async () => {
      setIcon(await getIconDetail(props.icon));
      setIsLoading(false);
    };
    fetchIcon();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={icon && `# ${icon.name}\n\n${icon.mdImage}`}
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
