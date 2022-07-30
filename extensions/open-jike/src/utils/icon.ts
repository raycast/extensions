import { Image } from '@raycast/api'

export const pictureWithCircle = (img: string) => ({
  source: img,
  mask: Image.Mask.Circle,
})
