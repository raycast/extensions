/** The code symbologies an entry can be drawn as. `bcid` is the bwip-js encoder name. */
export interface CodeFormat {
  id: string;
  title: string;
  bcid: string;
  /** 1D barcodes print the value underneath the bars. */
  showsText: boolean;
}

export const COMMON_FORMATS: CodeFormat[] = [
  { id: "qr", title: "QR Code", bcid: "qrcode", showsText: false },
  { id: "datamatrix", title: "Data Matrix", bcid: "datamatrix", showsText: false },
  { id: "aztec", title: "Aztec", bcid: "azteccode", showsText: false },
  { id: "pdf417", title: "PDF417", bcid: "pdf417", showsText: false },
];

export const BARCODE_FORMATS: CodeFormat[] = [
  { id: "code128", title: "Code 128", bcid: "code128", showsText: true },
  { id: "ean13", title: "EAN-13", bcid: "ean13", showsText: true },
  { id: "upca", title: "UPC-A", bcid: "upca", showsText: true },
  { id: "code39", title: "Code 39", bcid: "code39", showsText: true },
  { id: "itf", title: "ITF (Interleaved 2 of 5)", bcid: "interleaved2of5", showsText: true },
];

export const ALL_FORMATS = [...COMMON_FORMATS, ...BARCODE_FORMATS];

export const DEFAULT_FORMAT_ID = "qr";

/** Unknown ids (old CSV rows, hand edits) fall back to QR. */
export function getFormat(id: string | undefined): CodeFormat {
  return ALL_FORMATS.find((format) => format.id === id) ?? COMMON_FORMATS[0];
}
