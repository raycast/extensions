import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export class Cache {
  private static CACHE_DIR = path.join(environment.supportPath, "cache");
  private static CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  private static ensureCacheDirectory(): void {
    if (!fs.existsSync(this.CACHE_DIR)) {
      fs.mkdirSync(this.CACHE_DIR, { recursive: true });
    }
  }

  static set(key: string, data: unknown): void {
    try {
      this.ensureCacheDirectory();
      const safeKey = Buffer.from(key).toString("base64");
      const filePath = path.join(this.CACHE_DIR, `${safeKey}.json`);

      fs.writeFileSync(
        filePath,
        JSON.stringify({
          timestamp: Date.now(),
          data: data,
        }),
        "utf8",
      );
    } catch (error) {
      console.error("Cache write error:", error);
      showFailureToast(error, { title: "Cache Write Error" });
    }
  }

  static get<T>(key: string): T | null {
    try {
      const safeKey = Buffer.from(key).toString("base64");
      const filePath = path.join(this.CACHE_DIR, `${safeKey}.json`);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(filePath, "utf8"));

      if (Date.now() - cacheData.timestamp > this.CACHE_DURATION) {
        fs.unlinkSync(filePath);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error("Cache read error:", error);
      return null;
    }
  }

  static clear(): void {
    try {
      this.ensureCacheDirectory();
      const files = fs.readdirSync(this.CACHE_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          fs.unlinkSync(path.join(this.CACHE_DIR, file));
        }
      }
    } catch (error) {
      console.error("Cache clear error:", error);
      showFailureToast(error, { title: "Cache Clear Error" });
    }
  }

  static clearExpired(): void {
    this.ensureCacheDirectory();
    const files = fs.readdirSync(this.CACHE_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      try {
        const filePath = path.join(this.CACHE_DIR, file);
        const cacheData = JSON.parse(fs.readFileSync(filePath, "utf8"));

        if (Date.now() - cacheData.timestamp > this.CACHE_DURATION) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error("Error clearing expired cache:", error);
      }
    }
  }
}
