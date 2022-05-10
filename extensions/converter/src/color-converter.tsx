import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { commonPreferences } from "./utils/common-utils";
import { getInputItem } from "./hooks/get-input-item";
import { AllColors, AllOpacity, opacityToHex } from "./utils/color-converter-utils";
import * as d3 from "d3-color";
import { hsl, rgb } from "d3-color";

export default function CaseConverter() {
  const { autoDetect, priorityDetection } = commonPreferences();

  const [allColor, setAllColor] = useState<AllColors>({} as AllColors);
  const [allOpacity, setAllOpacity] = useState<AllOpacity>({} as AllOpacity);

  const inputItem = getInputItem(autoDetect, priorityDetection);
  useEffect(() => {
    async function _fetch() {
      const _inputItem = inputItem.trim();
      const _color = d3.color(_inputItem);
      if (_color instanceof rgb) {
        if (isNaN(_color.r)) return;
        setAllColor({ rgb: _inputItem, hex: _color.formatHex(), hsl: _color.formatHsl(), color: "" });
      } else if (_color instanceof hsl) {
        setAllColor({ rgb: _color.formatRgb(), hex: _color.formatHex(), hsl: _inputItem, color: "" });
      }
    }

    _fetch().then();
  }, [inputItem]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            icon={{ source: Icon.Clipboard, tintColor: allColor.rgb }}
            title={"Copy RGB"}
            content={allColor.rgb}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={"Copy HEX"}
              content={allColor.hex}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action.CopyToClipboard
              title={"Copy HSL"}
              content={allColor.hsl}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            <Action.CopyToClipboard
              title={"Copy Color"}
              content={allColor.color}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
            />
            <Action.CopyToClipboard
              title={"Copy Opacity"}
              content={allOpacity.opacity}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
            <Action.CopyToClipboard
              title={"Copy Opacity Hex"}
              content={allOpacity.opacityHex}
              shortcut={{ modifiers: ["cmd"], key: "6" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title={"Clear All"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
              onAction={() => {
                setAllColor({ rgb: "", hex: "", hsl: "", color: "" });
                setAllOpacity({} as AllOpacity);
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id={"Color Display"}
        title={"Display"}
        onChange={(newValue) => {
          if (typeof newValue === "string" && newValue !== allColor.rgb) {
            const _color = d3.color(newValue);
            if (_color === null) return;
            setAllColor({
              rgb: _color.formatRgb(),
              hex: _color.formatHex(),
              hsl: _color.formatHsl(),
              color: allColor.color,
            });
          }
        }}
      >
        <Form.DropdownItem
          value={allColor.rgb}
          title={"Current Color"}
          icon={{ source: "solid-circle.png", tintColor: allColor.rgb }}
        />
        <Form.DropdownItem
          value={d3.color(allColor.rgb)?.brighter().formatRgb() + ""}
          title={
            "Light Color " +
            (typeof d3.color(allColor.rgb)?.brighter().formatRgb() !== "undefined"
              ? d3.color(allColor.rgb)?.brighter().formatRgb()
              : "")
          }
          icon={{ source: "solid-circle.png", tintColor: d3.color(allColor.rgb)?.brighter().formatRgb() }}
        />
        <Form.DropdownItem
          value={d3.color(allColor.rgb)?.darker().formatRgb() + ""}
          title={
            "Dark Color " +
            (d3.color(allColor.rgb)?.darker().formatRgb() !== "undefined"
              ? d3.color(allColor.rgb)?.darker().formatRgb()
              : "")
          }
          icon={{ source: "solid-circle.png", tintColor: d3.color(allColor.rgb)?.darker().formatRgb() }}
        />
      </Form.Dropdown>
      <Form.TextField
        id={"RGB"}
        title={"RGB"}
        value={allColor.rgb}
        autoFocus={true}
        placeholder={"rgb(0, 0, 0) / rgba(0, 0, 0, 0)"}
        info={
          "rgb(255, 255, 255)\n" + "rgb(10%, 20%, 30%)\n" + "rgba(255, 255, 255, 0.4)\n" + "rgba(10%, 20%, 30%, 0.4)"
        }
        onChange={(newValue) => {
          const _color = d3.color(newValue.trim());
          if (_color === null) return;
          setAllColor({ rgb: newValue, hex: _color.formatHex(), hsl: _color.formatHsl(), color: "" });
        }}
      />
      <Form.TextField
        id={"HEX"}
        title={"HEX"}
        value={allColor.hex}
        placeholder={"#000000 / #00000000"}
        info={"#ffeeaa\n" + "#fea\n" + "#ffeeaa22\n" + "#fea2"}
        onChange={(newValue) => {
          const _color = d3.color(newValue.trim());
          if (_color === null) return;
          setAllColor({ rgb: _color.formatRgb(), hex: newValue, hsl: _color.formatHsl(), color: "" });
        }}
      />
      <Form.TextField
        id={"HSL"}
        title="HSL"
        value={allColor.hsl}
        placeholder={"hsl(0, 0%, 0%) / hsla(0, 0%, 0%, 0)"}
        info={"hsl(120, 50%, 20%)\n" + "hsla(120, 50%, 20%, 0.4)"}
        onChange={(newValue) => {
          const _color = d3.color(newValue.trim());
          if (_color === null) return;
          setAllColor({ rgb: _color.formatRgb(), hex: _color.formatHex(), hsl: newValue, color: "" });
        }}
      />
      <Form.TextField
        id={"Color"}
        title={"Color"}
        value={allColor.color}
        placeholder={"light black"}
        onChange={(newValue) => {
          const _color = d3.color(newValue.replaceAll(" ", ""));
          if (_color === null) return;
          setAllColor({
            rgb: _color.formatRgb(),
            hex: _color.formatHex(),
            hsl: _color.formatHsl(),
            color: newValue,
          });
        }}
      />
      <Form.Separator />
      <Form.TextField
        id={"Opacity"}
        title="Opacity"
        value={allOpacity.opacity}
        placeholder={"0-1"}
        info={"Values range from 0 to 1"}
        onChange={(newValue) => {
          let _opacity = parseFloat(newValue.replaceAll(" ", ""));
          if (_opacity > 1) _opacity = 1;
          if (_opacity < 0) _opacity = 0;
          if (isNaN(_opacity)) _opacity = 0;
          setAllOpacity({ opacity: newValue, opacityHex: opacityToHex(_opacity) });
        }}
      />
      <Form.TextField
        id={"OpacityHex"}
        title="Opacity Hex"
        value={allOpacity.opacityHex}
        placeholder={"00-ff"}
        info={"Values range from 00 to ff"}
        onChange={(newValue) => {
          let _opacityHex = parseInt(newValue.trim(), 16) / 255;
          if (_opacityHex > 1) _opacityHex = 1;
          if (_opacityHex < 0) _opacityHex = 0;
          if (isNaN(_opacityHex)) _opacityHex = 0;
          setAllOpacity({ opacity: _opacityHex.toFixed(1), opacityHex: newValue });
        }}
      />
    </Form>
  );
}
