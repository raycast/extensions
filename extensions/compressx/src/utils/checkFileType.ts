export enum FileType {
  Image,
  Video,
  Unknown,
}

export async function checkFileType(fileUrl: string): Promise<FileType> {
  try {
    const response = await fetch(fileUrl, { method: "HEAD" });
    const contentType = response.headers.get("content-type");

    if (contentType) {
      if (contentType.startsWith("image/")) {
        return FileType.Image;
      } else if (contentType.startsWith("video/")) {
        return FileType.Video;
      }
    }

    // If content-type is not available or doesn't match, try to check the file extension
    const extension = fileUrl.split(".").pop()?.toLowerCase();
    if (extension) {
      const imageExtensions = ["jpg", "jpeg", "png", "bmp", "webp", "tiff"];
      const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];

      if (imageExtensions.includes(extension)) {
        return FileType.Image;
      } else if (videoExtensions.includes(extension)) {
        return FileType.Video;
      }
    }

    return FileType.Unknown;
  } catch (error) {
    console.error("Error checking file type:", error);
    return FileType.Unknown;
  }
}
