export function humanFileSize(size: number) {
  const unit = Math.floor(Math.log(size) / Math.log(1000));

  return `${Math.round(size / Math.pow(1000, unit))} ${["B", "kB", "MB", "GB", "TB"][unit]}`;
}

export function getFileIconLink(mimeType: string, size = 32) {
  return `https://drive-thirdparty.googleusercontent.com/${size}/type/${mimeType}`;
}
