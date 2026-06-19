import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLogger, log, LogLevel, setLogLevel } from "../lib/logger";

beforeEach(() => {
  vi.restoreAllMocks();
  setLogLevel(LogLevel.DEBUG);
});

describe("createLogger", () => {
  it("returns an object with debug, info, warn, error methods", () => {
    const logger = createLogger("test");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});

describe("log levels", () => {
  it("debug logs when level is DEBUG", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    setLogLevel(LogLevel.DEBUG);
    log.files.debug("test message");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("[DEBUG]");
    expect(spy.mock.calls[0]![0]).toContain("[files]");
    expect(spy.mock.calls[0]![0]).toContain("test message");
  });

  it("debug does not log when level is INFO", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    setLogLevel(LogLevel.INFO);
    log.files.debug("suppressed");
    expect(spy).not.toHaveBeenCalled();
  });

  it("info logs when level is INFO", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    setLogLevel(LogLevel.INFO);
    log.files.info("info message");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("[INFO]");
  });

  it("info does not log when level is WARN", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    setLogLevel(LogLevel.WARN);
    log.files.info("suppressed");
    expect(spy).not.toHaveBeenCalled();
  });

  it("warn logs when level is WARN", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    setLogLevel(LogLevel.WARN);
    log.files.warn("warn message");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("[WARN]");
  });

  it("warn does not log when level is ERROR", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    setLogLevel(LogLevel.ERROR);
    log.files.warn("suppressed");
    expect(spy).not.toHaveBeenCalled();
  });

  it("error logs when level is ERROR", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    setLogLevel(LogLevel.ERROR);
    log.files.error("error message");
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]![0]).toContain("[ERROR]");
  });
});

describe("log data parameter", () => {
  it("debug passes data as second argument", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.files.debug("msg", { key: "value" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[DEBUG]"), { key: "value" });
  });

  it("info passes data as second argument", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.files.info("msg", { key: "value" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[INFO]"), { key: "value" });
  });

  it("warn passes data as second argument", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.files.warn("msg", { key: "value" });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[WARN]"), { key: "value" });
  });

  it("error passes error as second argument", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("test");
    log.files.error("msg", err);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[ERROR]"), err);
  });

  it("debug without data calls console.log with single arg", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.files.debug("no data");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("no data"));
    expect(spy.mock.calls[0]).toHaveLength(1);
  });

  it("warn without data calls console.warn with single arg", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.files.warn("no data");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("no data"));
    expect(spy.mock.calls[0]).toHaveLength(1);
  });

  it("error without data calls console.error with single arg", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.files.error("no data");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("no data"));
    expect(spy.mock.calls[0]).toHaveLength(1);
  });
});

describe("log modules", () => {
  it("has files and rename loggers", () => {
    expect(log.files).toBeDefined();
    expect(log.rename).toBeDefined();
  });

  it("each module logger tags output correctly", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.files.info("files msg");
    expect(spy.mock.calls[0]![0]).toContain("[files]");

    log.rename.info("rename msg");
    expect(spy.mock.calls[1]![0]).toContain("[rename]");
  });
});

describe("message formatting", () => {
  it("includes [renaming] prefix", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.files.info("test");
    expect(spy.mock.calls[0]![0]).toContain("[renaming]");
  });

  it("includes ISO timestamp", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    log.files.info("test");
    // ISO timestamp pattern: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(spy.mock.calls[0]![0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
