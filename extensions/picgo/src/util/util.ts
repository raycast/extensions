import fs from "fs";
import path from "path";

export function isImgFile(p: string) {
    const IMG_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];
    try {
        if (!fs.existsSync(p)) return false;

        const stats = fs.lstatSync(p);
        if (!stats.isFile()) return false;

        const ext = path.extname(p).toLowerCase();
        return IMG_EXTENSIONS.includes(ext);
    } catch (error) {
        return false;
    }
}

export function withTimeout<T>(promise: Promise<T>, ms: number = 30000, errMsg?: string) {
    const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(errMsg ?? `Timeout: ${ms / 1000}s`)), ms);
    });
    return Promise.race([promise, timeout]);
}
