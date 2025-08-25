import fs from "fs";
import path from "path";

class Logger {
  private static _instance?: Logger;
  private stream?: fs.WriteStream;

  private constructor() {
    const fileName = new Date().toLocaleDateString("sv").replace(/-/g, "") + ".log"; // 20250818.log
    const logDir = path.join(__dirname, "./logs");
    console.log("【Logger】logDir:", logDir);
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== "EEXIST") console.error("mkdir logs failed:", err);
    }
    const logFile = path.join(logDir, fileName);
    this.stream = fs.createWriteStream(logFile, { flags: "a", autoClose: false });
    this.stream.on("error", (err) => console.error("Logger stream error:", err));
    process.once("beforeExit", () => this.stream?.end());
    process.once("SIGINT", () => this.stream?.end());
  }

  public static getInstance(): Logger {
    if (!Logger._instance) Logger._instance = new Logger();
    return Logger._instance;
  }

  public write(line: string) {
    console.log(`【Logger】${line}`);
    if (this.stream) {
      this.stream.write(line + "\n");
    } else {
      console.error("Logger not ready, drop:", line);
    }
  }
}
const logger = Logger.getInstance();
export default logger;
