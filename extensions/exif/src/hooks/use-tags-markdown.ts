import type { Tags } from "exifreader";
import { useMemo } from "react";
import stringifyObject from "stringify-object";

import { prettifyJson } from "@/utils/string";

const useTagsMarkdown = (tags: Tags, file: string, maxNumberLineLength: number = 50) => {
  const image = useMemo(() => {
    const url = file.startsWith("file://") ? file.slice(7) : file;
    return ["## Image", `<img height="150" src="${url}" />`].join("\n");
  }, [file]);

  const thumbnail = useMemo(() => {
    if (tags.Thumbnail?.base64) {
      return ["## Thumbnail", `<img height="150" src="data:image/jpeg;base64,${tags.Thumbnail.base64}" />`].join("\n");
    }
    return "";
  }, [tags]);

  const location = useMemo(() => {
    if (tags.GPSLatitude && tags.GPSLongitude && tags.GPSLatitudeRef && tags.GPSLongitudeRef) {
      const latRef = (tags.GPSLatitudeRef.value as string[])[0] === "N" ? "" : "-";
      const lat = tags.GPSLatitude.description;
      const lonRef = (tags.GPSLongitudeRef.value as string[])[0] === "E" ? "" : "-";
      const lon = tags.GPSLongitude.description;
      const url = `https://maps.google.com/maps?f=q&q=loc:${latRef}${lat},${lonRef}${lon}&t=k&spn=0.5,0.5`;
      const osmUrl = `https://www.openstreetmap.org/#map=20/${latRef}${lat}/${lonRef}${lon}`;
      const bingUrl = `https://www.bing.com/maps/?v=2&cp=${latRef}${lat}~${lonRef}${lon}&lvl=18.0&sty=c`;
      return [
        "## GPS coordinates found",
        `Open in: [Google Maps](${url}) | [OpenStreetMap](${osmUrl}) | [Bing Maps](${bingUrl})`,
      ].join("\n");
    }
    return "";
  }, [tags]);

  const stringified = useMemo(() => stringifyObject(tags, { indent: "  ", inlineCharacterLimit: 25 }), [tags]);
  const stringifiedJson = useMemo(
    () => prettifyJson(stringified, maxNumberLineLength),
    [stringified, maxNumberLineLength],
  );
  const rawTagsMarkdown = useMemo(() => ["## Raw Tags", "```", stringifiedJson, "```"].join("\n"), [stringifiedJson]);

  return { image, thumbnail, location, rawTagsMarkdown, stringifiedJson };
};

export default useTagsMarkdown;
