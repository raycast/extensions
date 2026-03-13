import { Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import single from "../api/single";
import { eachHex, hexToRgb } from "../utils/util";
import { useState } from "react";
import { Svgs } from "../ui/svg";

export const PaletteDetail = ({ id }: { id: string }) => {
  const [copyWith, setCopyWith] = useState("hex");
  const { data: svgData, isLoading: svgLoading } = Svgs.detail()(id, true);

  const { data, isLoading } = single(id);
  const hexes = Array.from(eachHex(id));

  // todo add collections action

  return (
    <Detail
      isLoading={isLoading || svgLoading}
      markdown={svgData ? `![](file://${encodeURI(svgData)})` : ""}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Copy with..">
            <Detail.Metadata.TagList.Item
              text="HEX"
              icon={copyWith === "hex" ? Icon.Checkmark : undefined}
              onAction={() => {
                setCopyWith("hex");
              }}
            />
            <Detail.Metadata.TagList.Item
              text="RGB"
              icon={copyWith === "rgb" ? Icon.Checkmark : undefined}
              onAction={() => {
                setCopyWith("rgb");
              }}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Colors">
            {hexes.map((hex) => {
              const data = copyWith === "rgb" ? `rgb(${hexToRgb(hex).join(",")})` : `#${hex}`;
              return (
                <Detail.Metadata.TagList.Item
                  key={hex}
                  text={data}
                  color={`#${hex}`}
                  icon={Icon.CircleFilled}
                  onAction={() => {
                    Clipboard.copy(`${data}`).then(() => {
                      return showToast(Toast.Style.Success, "Copied to clipboard");
                    });
                  }}
                />
              );
            })}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />

          {data ? (
            <>
              <Detail.Metadata.TagList title="Collections">
                {data.tags?.split(" ").map((tag) => <Detail.Metadata.TagList.Item text={tag} key={tag} />)}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Label title="Likes" icon={Icon.Heart} text={data.likes} />
              <Detail.Metadata.Label title="Date" text={data.date} />
            </>
          ) : (
            <></>
          )}
          <Detail.Metadata.Link title="Link" target={`https://colorhunt.co/palette/${id}`} text="colorhunt" />
        </Detail.Metadata>
      }
    />
  );
};
