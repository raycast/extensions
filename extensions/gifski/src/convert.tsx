import { useState, useEffect } from "react";
import { Detail, getSelectedFinderItems } from "@raycast/api";
import { findFFMpegCLIPath, findGifSkiPath } from "./gifski/gifski";
import { ConverterForm } from "./components/ConverterForm";

export default function Command() {
  const [initialFinderFiles, setInitialFinderFiles] = useState<string[]>([]);
  const [ffmpeg, setFFMpeg] = useState<string | null>(null);
  const [gifski, setGifSki] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const cliPath = await findFFMpegCLIPath();
        setFFMpeg(cliPath);
        const gifskiPath = await findGifSkiPath();
        setGifSki(gifskiPath);

        if (cliPath && gifskiPath) {
          try {
            const finderItems = await getSelectedFinderItems();
            setInitialFinderFiles(finderItems.map((item) => item.path));
          } catch (finderError) {
            console.warn("Could not get selected Finder items:", finderError);
            setInitialFinderFiles([]);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return isLoading ? (
    <Detail isLoading={true} />
  ) : ffmpeg && gifski ? (
    <ConverterForm initialFiles={initialFinderFiles} />
  ) : (
    <Detail
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link title="Github" target="https://github.com/marcopelegrini" text="marcopelegrini" />
          <Detail.Metadata.Link title="download" target="https://gif.ski/" text="GifSki" />
          <Detail.Metadata.Link title="download" target="https://ffmpeg.org/" text="FFmpeg" />
        </Detail.Metadata>
      }
      markdown={`
## ⛷️ GifSki for Raycast

Requirements:

${
  !ffmpeg
    ? `
- Please install ffmpeg:

      brew install ffmpeg
`
    : ""
}

${
  !gifski
    ? `
- Please install gifski: 
      
      brew install gifski
`
    : ""
}

- Reload the extension.
`}
    />
  );
}
