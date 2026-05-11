const strings = {
  // decode
  decode_file_title: "Image File",
  decode_clipboard_hint: "Leave file picker empty to decode the clipboard image",
  decode_submit: "Decode",
  decode_no_qr: "No QR code found in this image.",
  decode_error_title: "Decode Failed",
  decode_result_title: "Decoded Content",
  decode_type: "Type",
  decode_length: "Characters",
  decode_network: "Network",
  decode_encryption: "Encryption",
  decode_back: "Go Back",
  decode_copy: "Copy Content",
  decode_open_url: "Open URL",
  decode_copy_password: "Copy Wi-Fi Password",
  decode_no_image: "Please select an image or copy one to clipboard first",
  // generate
  generate_content_title: "Content",
  generate_content_placeholder: "Enter text, URL, or any content…",
  generate_submit: "Generate",
  generate_generating: "Generating QR code…",
  generate_empty: "Please enter some content",
  generate_error_title: "Generation Failed",
  generate_result_title: "QR Code Preview",
  generate_chars: "Characters",
  generate_type: "Content Type",
  generate_ecc: "Error Correction",
  generate_dark_color: "Foreground Color",
  generate_light_color: "Background Color",
  generate_margin: "Margin",
  generate_ecc_l: "Low — 7%",
  generate_ecc_m: "Medium — 15%",
  generate_ecc_q: "Quartile — 25%",
  generate_ecc_h: "High — 30%",
  generate_color_error: "Must be a hex color, e.g. #1a2b3c",
  generate_copy_png: "Copy PNG to Clipboard",
  generate_save_png: "Save PNG to Desktop",
  generate_copy_svg: "Copy SVG",
  generate_copy_text: "Copy Original Text",
  generate_copied: "PNG copied to clipboard",
  generate_saved: "Saved to Desktop",
  generate_save_failed: "Failed to save PNG",
  generate_copy_failed: "Failed to copy PNG",
  generate_back: "Go Back",
  // content types
  type_url: "URL",
  type_wifi: "Wi-Fi",
  type_vcard: "Contact",
  type_text: "Plain Text",
} as const;

type StringKey = keyof typeof strings;

export function t(key: StringKey): string {
  return strings[key];
}
