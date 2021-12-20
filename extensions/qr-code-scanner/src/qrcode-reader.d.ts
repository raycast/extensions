import { bitmap } from "jimp";

export type QRDecoder = (bitmap: bitmap) => string

declare module 'qrcode-reader' {
  export default class {
    decode: QRDecoder
    callback: (err: Error | null, value: string) => void
  }
}
