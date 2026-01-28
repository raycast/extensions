type Status = "success" | "fail" | "info" | "warn" | "todo";

const StatusEmoji = {
  success: "✅",
  fail: "🚨",
  info: "ℹ️",
  warn: "⚠️",
  todo: "☑️",
};

export interface Stage {
  name: string;
  status: Status;
  logs?: Log[];
}

interface Log {
  message: string;
  status: Status;
}

type MarkdownReader = (stages: Stage[]) => string;

export class MarkdownLogger {
  private static instance: MarkdownLogger;

  private static markdownReader: MarkdownReader = markdownReader;

  private readonly updater: (s: string) => void;

  private readonly stages: Stage[];

  private constructor(stages: Stage[], updater?: (s: string) => void) {
    this.stages = stages.map((s) => ({ ...s, logs: [] }));
    this.updater = updater || (() => {});

    this.update();
  }

  public static getInstance(stages: Stage[], updater?: (s: string) => void): MarkdownLogger {
    if (!MarkdownLogger.instance) {
      MarkdownLogger.instance = new MarkdownLogger(stages, updater);
    }

    return MarkdownLogger.instance;
  }

  public finish(stage: string, msg?: string): void {
    const stages = this.stages.filter((s) => s.name === stage);
    if (stages.length > 0) {
      stages[0].status = "success";
    }

    this.log(stage, msg || "finished", "success");
    this.update();
  }

  public log(stage: string, message: string, status: Status): void {
    const stages = this.stages.filter((s) => s.name === stage);
    if (stages.length > 0) {
      stages[0].status = status;
      stages[0]?.logs?.push({ message: `\`${message}\``, status });
    }

    this.update();
  }

  public toMarkdown(): string {
    return MarkdownLogger.markdownReader(this.stages);
  }

  private update() {
    this.updater(this.toMarkdown());
  }
}

const markdownLogger = (stages: Stage[], updater?: (s: string) => void): MarkdownLogger => {
  return MarkdownLogger.getInstance(stages, updater);
};

function markdownReader(stages: Stage[]): string {
  const finished = stages.filter((s) => s.status === "success").length === stages.length;
  const failed = stages.filter((s) => s.status === "fail").length > 0;

  let head = "## Progressing image ![loading](https://images.godruoyi.com/loading.gif)\n\n";
  if (finished) {
    head = "## All actions have completed 🎉";
  } else if (failed) {
    head = "## Some actions have failed 🚨";
  }

  return stages.reduce((acc, s) => {
    const logs = s.logs?.reduce((acc, l) => {
      const status = l.status === "fail" || l.status === "warn" || l.status === "info" ? StatusEmoji[l.status] : "";
      return `${acc}\n  - ${status} ${l.message}`;
    }, "");

    const newLine = `- ${StatusEmoji[s.status]} ${s.name}${logs || ""}`;

    return `${acc}\n${newLine}`;
  }, head);
}

export default {
  markdownLogger,
};
