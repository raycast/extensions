import { Action, ActionPanel, Form } from "@raycast/api";
import chroma from "chroma-js";

import { useState } from "react";
import { useForm } from "./lib/use-form";
import { DefaultForm } from "./components/DefaultForm";

export default () => {
  const [colors, setColors] = useState({
    hex: "",
    rgb: "",
    hls: "",
  });
  const formProps = useForm({
    transform: (value: string) => {
      const valid = chroma.valid(value);
      if (!valid) {
        setColors({ hex: "", rgb: "", hls: "" });
        return "";
      }
      setColors({
        hex: valid ? chroma(value).hex() : "",
        rgb: valid ? chroma(value).css() : "",
        hls: valid ? chroma(value).css("hsl") : "",
      });
      return chroma(value).hex();
    },
  });

  const noop = () => {
    //
  };

  return (
    <DefaultForm
      {...formProps}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={colors.hex} title="Copy hex" />
          <Action.CopyToClipboard content={colors.rgb} title="Copy rgb" />
          <Action.CopyToClipboard
            content={colors.hls}
            title="Copy hls"
            shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
          />
        </ActionPanel>
      }
      output={
        <>
          <Form.TextField value={colors.hex} id="hex" title="hex" onChange={noop} />
          <Form.TextField value={colors.rgb} id="rgb" title="rgb" onChange={noop} />
          <Form.TextField value={colors.hls} id="hls" title="hls" onChange={noop} />
        </>
      }
    />
  );
};
