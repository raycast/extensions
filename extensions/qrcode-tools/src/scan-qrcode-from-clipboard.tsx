import { Detail, ActionPanel, Action } from "@raycast/api";
import { FC, ReactNode, useMemo } from "react";
import { useAsync } from "react-use";
import { readFileURL } from "./clipboard";
import {
  analyzeQRCodeType,
  createQRCodeFromImage,
  decodeImageFromArrayBuffer as decodeImageFromBuffer,
  readFileAsBuffer,
} from "./qrcode";
import { QRCode } from "jsqr";
import Jimp from "jimp";
import { ErrorView } from "./error-view";

export default function Command() {
  const state = useAsync(async () => {
    const fileURL = await readFileURL();
    if (!fileURL) {
      throw new Error("Cannot found file of clipboard");
    }

    const buffer = await readFileAsBuffer(fileURL);

    const image = await decodeImageFromBuffer(buffer);

    const code = await createQRCodeFromImage(image);

    return { code, image, fileURL, fileBuffer: buffer };
  }, []);

  if (state.loading) {
    return <LoadingApp />;
  }

  if (state.error) {
    return <ErrorView error={state.error} />;
  }

  return <SuccessfulApp {...state.value!} />;
}

function LoadingApp() {
  return <Detail isLoading={true} />;
}

const SuccessfulApp: FC<{
  code: QRCode;
  image: Jimp;
  fileURL: string;
}> = (props) => {
  const { code, image, fileURL } = props;

  const text = code.data;

  const textType = useMemo(() => analyzeQRCodeType(text), [text]);

  const markdown = `

\`\`\`text
${text}
\`\`\`

Use action to open or copy it.

<div style="text-align: center;">

![](${fileURL})

</div>
  `.trim();

  const actions: ReactNode[] = [<Action.CopyToClipboard content={text} />];

  if (textType.url) {
    actions.unshift(<Action.OpenInBrowser url={text} />);
  }

  return (
    <Detail
      markdown={markdown}
      actions={<ActionPanel title="QRCode">{...actions}</ActionPanel>}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Width" text={`${image.bitmap.width}`} />
          <Detail.Metadata.Label title="Height" text={`${image.bitmap.height}`} />
          <Detail.Metadata.Label title="Version" text={`${code.version}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Chunks" text={`${code.chunks.map((v) => v.type)}`} />
        </Detail.Metadata>
      }
    />
  );
};
