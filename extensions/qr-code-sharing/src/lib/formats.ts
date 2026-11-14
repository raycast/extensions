/** The code symbologies the clipboard can be drawn as. `bcid` is the bwip-js encoder name. */
export interface CodeFormat {
  id: string;
  title: string;
  bcid: string;
  /** 1D barcodes print the value underneath the bars. */
  showsText: boolean;
}

export const QR_FORMAT: CodeFormat = { id: "qr", title: "QR Code", bcid: "qrcode", showsText: false };

/** Code 128 holds any ASCII text, so it is the one barcode that suits arbitrary content. */
export const BARCODE_FORMAT: CodeFormat = { id: "code128", title: "Barcode", bcid: "code128", showsText: true };

export function getFormat(id: string): CodeFormat {
  return id === BARCODE_FORMAT.id ? BARCODE_FORMAT : QR_FORMAT;
}
