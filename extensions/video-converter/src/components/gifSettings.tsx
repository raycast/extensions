import { Form } from "@raycast/api";
import type { FormValues } from "../types";

export default function GifSettings({
  values,
  sourceFps,
  onChange,
}: {
  values: FormValues;
  sourceFps: string;
  onChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
}) {
  return (
    <>
      <Form.TextField
        id="gifQuality"
        title="Quality (%)"
        value={values.gifQuality}
        onChange={(value) => onChange("gifQuality", value)}
        info="1–100%. Higher quality usually produces a larger GIF."
      />
      <Form.TextField
        id="gifFps"
        title="FPS"
        value={values.gifFps || sourceFps}
        onChange={(value) => onChange("gifFps", value)}
        placeholder="From source video"
        info="Defaults to each source video's FPS (up to 100). Clear to restore automatic FPS. GIF timing is rounded to hundredths of a second."
      />
    </>
  );
}
