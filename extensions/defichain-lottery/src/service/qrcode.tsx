import QRCode from "qrcode";

export async function qrCodeFromAddress(address: string): Promise<string> {
  const options = {
    quality: 0.8,
    version: 6,
    color: {
      dark: "#fe00af",
      light: "#dfe2e4",
    },
  };

  return await QRCode.toDataURL(address, options);
}
