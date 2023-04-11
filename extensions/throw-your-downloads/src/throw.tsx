import { useEffect } from "react";
import { useNavigation, showHUD } from "@raycast/api";
import * as fs from "fs/promises";
import * as path from "path";

export default function ClearDownloads() {
  const { pop } = useNavigation();

  useEffect(() => {
    clearDownloadsFolder()
      .then(() => {
        showHUD("🗑️ Downloads folder cleared");
        pop();
      })
      .catch((error) => {
        console.error("Error al borrar el contenido de la carpeta de descargas:", error);
      });
  }, []);

  async function clearDownloadsFolder() {
    const downloadsPath = path.join(process.env.HOME || "", "Downloads");
    const files = await fs.readdir(downloadsPath);
    for (const file of files) {
      const filePath = path.join(downloadsPath, file);
      await fs.rm(filePath, { recursive: true, force: true });
    }
  }

  return null;
}
