import {
  Action,
  ActionPanel,
  Detail,
  environment,
  Form,
  Icon,
  Keyboard,
  render,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { backgroundColors, hairColors, Svg } from "./components/Svg";
import { renderToString } from "react-dom/server";
import { useCallback, useEffect, useState } from "react";
import * as fs from "node:fs";
import { homedir } from "os";
import { showFailureToast, useCachedState, useForm } from "@raycast/utils";
import path from "node:path";
import debounce from "lodash.debounce";
import wasm from "@resvg/resvg-wasm/index_bg.wasm";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import Shortcut = Keyboard.Shortcut;

const DOWNLOADS_DIR = `${homedir()}/Downloads`;

function Command() {
  const [img, setImg] = useState("");
  const [loading, setLoading] = useState(true);
  const [hairColor, setHairColor] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [size, setSize] = useCachedState("size", { w: 500, h: 500 });

  const generate = useCallback(async () => {
    setLoading(true);
    await showToast(Toast.Style.Animated, "Generating image");
    // Persist SVG to disk
    const svg = renderToString(
      <Svg backgroundColor={backgroundColor} hairColor={hairColor} width={size.w} height={size.h} />,
    );
    fs.writeFileSync(environment.supportPath + "/face.svg", svg);
    // Convert SVG to PNG
    const resvg = new Resvg(svg);
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    // Persist PNG to disk
    fs.writeFileSync(environment.supportPath + "/face.png", pngBuffer);

    const markdownImg = `![SVG](data:image/png;base64,${Buffer.from(pngBuffer).toString("base64")}?raycast-height=355)`;

    setImg(markdownImg);
    setLoading(false);
    await showToast(Toast.Style.Success, "Image Generated");
  }, [backgroundColor, hairColor, size]);

  const download = async (filename: string, suffix?: number): Promise<void> => {
    const toast = await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");
    try {
      const data = fs.readFileSync(environment.supportPath + `/${filename}`);

      const ext = path.extname(filename);
      const newFilename = filename.replace(ext, suffix ? `_${suffix}${ext}` : ext);
      const savePath = `${DOWNLOADS_DIR}/${newFilename}`;

      if (fs.existsSync(savePath)) {
        return await download(filename, (suffix || 0) + 1);
      }

      fs.writeFileSync(savePath, data);
      toast.style = Toast.Style.Success;
      toast.title = "Image Downloaded!";
      toast.message = DOWNLOADS_DIR;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to download image";
      toast.message = String(error);
    }
  };

  useEffect(() => {
    generate();
  }, [size]);

  const { pop } = useNavigation();

  return (
    <Detail
      isLoading={loading}
      markdown={img}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label text={`${size.w}x${size.h}`} title={"size"} />

          <Detail.Metadata.TagList title="hair color">
            {hairColors.map((color) => (
              <Detail.Metadata.TagList.Item
                key={color}
                icon={hairColor === color ? Icon.Checkmark : Icon.Minus}
                color={color}
                onAction={() => {
                  setHairColor((prev) => (prev === color ? null : color));
                }}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="background color">
            {backgroundColors.map((color) => (
              <Detail.Metadata.TagList.Item
                key={color}
                icon={backgroundColor === color ? Icon.Checkmark : Icon.Minus}
                color={color}
                onAction={() => {
                  setBackgroundColor((prev) => (prev === color ? null : color));
                }}
              />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title={"Regenerate"} icon={Icon.Repeat} onAction={debounce(() => generate(), 250)} />
          <Action.Push
            title={"Edit Size"}
            icon={Icon.Pencil}
            target={
              <SizeForm
                size={size}
                submit={(w, h) => {
                  setSize({ w, h });
                  pop();
                }}
              />
            }
          />
          <Action.CopyToClipboard
            title={"Copy Png"}
            content={{ file: environment.supportPath + "/face.png" }}
            shortcut={Shortcut.Common.Copy}
          />
          <Action
            title={"Download Png"}
            icon={Icon.Download}
            onAction={() => download("face.png")}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "p",
            }}
          />
          <Action
            title={"Download SVG"}
            icon={Icon.Download}
            onAction={() => download("face.svg")}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "d",
            }}
          />
        </ActionPanel>
      }
    />
  );
}

const SizeForm = ({
  size,
  submit,
}: {
  size: {
    w: number;
    h: number;
  };
  submit: (w: number, h: number) => void;
}) => {
  const { itemProps, handleSubmit } = useForm<{
    w: string;
    h: string;
  }>({
    onSubmit: (values) => {
      submit(parseInt(values.w), parseInt(values.h));
    },
    validation: {
      w: (v) => {
        if (v && isNaN(parseInt(v))) {
          return "Must be a number";
        }
        if (v === undefined) {
          return "Required";
        }
      },
      h: (v) => {
        if (v && isNaN(parseInt(v))) {
          return "Must be a number";
        }
        if (v === undefined) {
          return "Required";
        }
      },
    },
    initialValues: {
      w: size.w.toString(),
      h: size.h.toString(),
    },
  });

  return (
    <Form
      navigationTitle={"Change Image Size"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Save"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title={"Width"} {...itemProps.w} />
      <Form.TextField title={"Height"} {...itemProps.h} />
    </Form>
  );
};

export default function () {
  (async () => {
    await initWasm(wasm);
    render(<Command />);
  })().catch((e) => showFailureToast(e));
}
