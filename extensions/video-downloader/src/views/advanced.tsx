import { Form } from "@raycast/api";
import { Clip } from "../components/clip.js";
import { ItemProps, Video } from "../types.js";

export default function Advanced({
  itemProps,
  show,
  video,
  onChange,
}: {
  itemProps: ItemProps;
  show: boolean;
  video: Video;
  onChange: (value: boolean) => void;
}) {
  return (
    <>
      <Form.Checkbox id="advanced" title="Advanced" value={show} label="Show" onChange={onChange} />
      {show && <Clip itemProps={itemProps} duration={video.duration} />}
    </>
  );
}
