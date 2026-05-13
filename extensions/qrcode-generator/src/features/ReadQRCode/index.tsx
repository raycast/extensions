import { showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import ReadForm from "./components/ReadForm";
import ResultView from "./components/ResultView";
import { decodeImage } from "./services/decodeImage";
import type { DecodeAction, DecodeResult, ImageSource } from "./types";

const shouldNotify = (source: ImageSource) => source === "screenshot" && process.platform === "win32";

export default function ReadQRCode() {
  const { push } = useNavigation();

  const showResult = useCallback(
    (r: DecodeResult) => push(<ResultView text={r.text} imagePath={r.imagePath} />),
    [push],
  );

  const decode: DecodeAction = async (filePath, source) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Decoding QR Code…" });
    try {
      const text = await decodeImage(filePath);
      toast.style = Toast.Style.Success;
      toast.title = "Decoded successfully";
      showResult({ text, imagePath: filePath });
      if (shouldNotify(source)) {
        await showHUD("QR Code decoded — open Raycast to view");
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to decode";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return <ReadForm onDecode={decode} />;
}
