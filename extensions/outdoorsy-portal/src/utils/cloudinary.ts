export function makeCloudinaryTransformedImageUrl(imageUrl: string, width: number, height: number) {
  if (!imageUrl.trim()) {
    return "";
  }

  const parts = imageUrl.trim().split('/upload/');

  const transformedImageUrl = `${parts[0]}/upload/a_exif,c_fill,e_improve,h_${height},w_${width}/${parts[1]}`;

  return transformedImageUrl;
}
