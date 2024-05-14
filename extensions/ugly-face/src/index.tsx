import { Action, ActionPanel, Detail, environment, Icon, showToast, Toast } from "@raycast/api";
import { Svg } from "./components/Svg";
import { renderToString } from "react-dom/server";
import { useEffect, useState } from "react";
import * as fs from "node:fs";
import { homedir } from "os";
import { showFailureToast } from "@raycast/utils";
import { initWasm, Resvg } from "../lib/resvg";
import path from "node:path";
import debounce from "lodash.debounce";

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

export default function Command() {
  const [img, setImg] = useState("");
  const [loading, setLoading] = useState(true);

  const generate = debounce(async () => {
    setLoading(true);
    await showToast(Toast.Style.Animated, "Generating image");

    // Persist SVG to disk
    const svg = renderToString(<Svg />);
    fs.writeFileSync(environment.supportPath + "/face.svg", svg);
    // Convert SVG to PNG
    const resvg = new Resvg(svg, { fitTo: { mode: "original" } });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    // Persist PNG to disk
    fs.writeFileSync(environment.supportPath + "/face.png", pngBuffer);

    const markdownImg = `![SVG](data:image/png;base64,${Buffer.from(pngBuffer).toString("base64")}?raycast-height=350)`;

    setImg(markdownImg);
    setLoading(false);
    await showToast(Toast.Style.Success, "Image Generated");
  }, 250);

  const download = async (filename: string, suffix?: number): Promise<void> => {
    try {
      await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");
      const data = fs.readFileSync(environment.supportPath + `/${filename}`);

      const ext = path.extname(filename);
      const newFilename = filename.replace(ext, suffix ? `_${suffix}${ext}` : ext);
      const savePath = `${DOWNLOADS_DIR}/${newFilename}`;

      if (fs.existsSync(savePath)) {
        return await download(filename, (suffix || 0) + 1);
      }

      fs.writeFileSync(savePath, data);
      await showToast(Toast.Style.Success, "Image Downloaded!", DOWNLOADS_DIR);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to download image" });
    }
  };

  useEffect(() => {
    (async () => {
      await initWasm(fs.readFileSync(path.join(environment.assetsPath, "index_bg.wasm")));
      await generate();
    })();
  }, []);

  return (
    <Detail
      isLoading={loading}
      markdown={img}
      actions={
        <ActionPanel>
          <Action title={"Regenerate"} icon={Icon.Repeat} onAction={generate} />
          <Action title={"Download PNG"} icon={Icon.Download} onAction={() => download("face.png")} />
          <Action
            title={"Download SVG"}
            icon={Icon.Download}
            onAction={() => download("face.svg")}
            shortcut={{
              modifiers: ["cmd"],
              key: "d",
            }}
          />
        </ActionPanel>
      }
    />
  );
}
