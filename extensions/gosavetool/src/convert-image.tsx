import { ImageForm } from "./lib/image-form";

export default function Command() {
  return <ImageForm defaultFormat="webp" onlineTool="convert-image-format" />;
}
