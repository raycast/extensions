import { ReadStream } from "fs";
import gifFrames from "gif-frames";
import { useEffect, useState } from "react";

export const DECODE_OUTPUT_TYPE = "jpeg";

export interface DecodedGifState {
  url: string;
  frames?: string[];
  isDecoded: boolean;
}

export function useGifDecoder(url: string, id: string | number) {
  const [state, setState] = useState<DecodedGifState>({ url, isDecoded: false });

  useEffect(() => {
    async function decode() {
      const frames = await gifFrames({
        url,
        frames: "all",
        cumulative: true,
        quality: 50,
        outputType: DECODE_OUTPUT_TYPE,
      });
      const base64Frames: string[] = [];

      for (const frame of frames) {
        const buff = await stream2buffer(frame.getImage());
        base64Frames.push(`data:image/${DECODE_OUTPUT_TYPE};base64,${buff.toString("base64")}`);
      }

      setState({ url, frames: base64Frames, isDecoded: true });
    }

    decode();
  }, [url]);

  return state;
}

async function stream2buffer(stream: ReadStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks = Array<any>();
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(`error converting stream - ${err}`));
  });
}
