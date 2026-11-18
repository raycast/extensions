import { ImageToolForm } from "./components/ImageToolForm";
import { Loader } from "./components/Loader";
import { selectedImage } from "./lib/selection";

export default function Command() {
  return <Loader load={selectedImage} render={(file) => <ImageToolForm tool="background" initialFile={file} />} />;
}
