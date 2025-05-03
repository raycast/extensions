export function getContentIcon(type: string, mediaType?: string) {
  if (type == "page") {
    return "confluence-icon-page.svg";
  } else if (type == "blogpost") {
    return "confluence-icon-blog.svg";
  }
  if (mediaType) {
    switch (true) {
      case mediaType.startsWith("image"):
        return "confluence-icon-image.svg";
      case mediaType == "application/pdf":
        return "confluence-icon-pdf.svg";
      case mediaType == "application/zip":
        return "confluence-icon-zip.svg";
      case mediaType == "application/octet-stream":
        return "confluence-icon-file.svg";
      case mediaType.indexOf("audio") > -1:
        return "confluence-icon-audio.svg";
      case mediaType.indexOf("video") > -1:
        return "confluence-icon-video.svg";
      case mediaType.indexOf("sheet") > -1:
        return "confluence-icon-spreadsheet.svg";
    }
    return "confluence-icon-file.svg";
  }
  return "confluence-icon-all.svg";
}
