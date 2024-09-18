import { Form, ActionPanel, Action, showToast, Toast, Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { useState } from "react";
import { pixelToViewportUnit } from "./utils";
import { Option, SizeOption, Sizes, Values } from "./types";

const sizeOptions: Option[] = [
  { value: "width", title: "Width" },
  { value: "height", title: "Height" },
];

const widthViewportOptions: SizeOption[] = [
  {
    label: "Desktop",
    options: [
      { value: "1440", title: "Desktop - 1440px" },
      { value: "1512", title: 'MacBook Pro 14" - 1512px' },
      { value: "1728", title: 'MacBook Pro 16" - 1728px' },
    ],
  },
  {
    label: "Tablet",
    options: [
      { value: "1024", title: 'iPad Pro 12.9" - 1024px' },
      { value: "834", title: 'iPad Pro 11" - 834px' },
      { value: "744", title: "iPad mini 8.3 - 744px" },
    ],
  },
  {
    label: "Mobile",
    options: [
      { value: "390", title: "iPhone 14 - 390px" },
      { value: "393", title: "iPhone 14 Pro - 393px" },
      { value: "430", title: "iPhone 14 Pro Max - 430px" },
      { value: "375", title: "iPhone 13 mini - 375px" },
      { value: "320", title: "iPhone SE - 320px" },
    ],
  },
];

const heightViewportOptions: SizeOption[] = [
  {
    label: "Desktop",
    options: [
      { value: "1024", title: "Desktop - 1024px" },
      { value: "982", title: 'MacBook Pro 14" - 982px' },
      { value: "1117", title: 'MacBook Pro 16" - 1117px' },
    ],
  },
  {
    label: "Tablet",
    options: [
      { value: "1366", title: 'iPad Pro 12.9" - 1366px' },
      { value: "1194", title: 'iPad Pro 11" - 1194px' },
      { value: "1133", title: "iPad mini 8.3 - 1133px" },
    ],
  },
  {
    label: "Mobile",
    options: [
      { value: "844", title: "iPhone 14 - 844px" },
      { value: "852", title: "iPhone 14 Pro - 852px" },
      { value: "932", title: "iPhone 14 Pro Max - 932" },
      { value: "812", title: "iPhone 13 mini - 812px" },
      { value: "568", title: "iPhone SE - 568px" },
    ],
  },
];

export default function Command() {
  const [sizeType, setSizeType] = useState("width");
  const [nameError, setNameError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function handleSubmit(values: Values) {
    const dataSend: Sizes = {
      pixels: parseInt(values.textfield),
      width: null,
      height: null,
    };

    const unity = sizeType === "width" ? "vw" : "vh";

    if (!isNaN(dataSend.pixels as any)) {
      if (sizeType === "width") {
        dataSend.width = parseInt(values.dropdown);
      } else {
        dataSend.height = parseInt(values.dropdown);
      }
      closeMainWindow();
    } else {
      showToast({
        title: "Error",
        message: "The field 'Size in pixels' should't be empty!",
        style: Toast.Style.Failure,
      });
    }

    const resultConvertion = pixelToViewportUnit(dataSend);

    Clipboard.copy(resultConvertion + unity);
    showHUD(`📋 ${resultConvertion + unity} copied to clipboard`);
    showToast({ title: "Copied to clipboard:", message: resultConvertion + unity });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Select your device and enter the size in pixels to be converted." />
      <Form.Dropdown id="sizedropdown" title="Property" value={sizeType} onChange={setSizeType}>
        {sizeOptions.map((option, index) => (
          <Form.Dropdown.Item key={index} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      {sizeType === "width" && (
        <Form.Dropdown id="dropdown" title="Device">
          {widthViewportOptions.map((group, index) => (
            <Form.Dropdown.Section key={index} title={group.label}>
              {group.options.map((option, idx) => (
                <Form.Dropdown.Item key={idx} value={option.value} title={option.title} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}
      {sizeType === "height" && (
        <Form.Dropdown id="dropdown" title="Device">
          {heightViewportOptions.map((group, index) => (
            <Form.Dropdown.Section key={index} title={group.label}>
              {group.options.map((option, idx) => (
                <Form.Dropdown.Item key={idx} value={option.value} title={option.title} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="textfield"
        title="Size in pixels"
        placeholder="16"
        storeValue
        autoFocus
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.Description text="Based on Figma frames." />
    </Form>
  );
}
