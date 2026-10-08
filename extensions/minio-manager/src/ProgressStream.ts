import { Transform, TransformCallback } from "stream";

export interface ProgressStats {
  transferred: number;
  total: number;
  percentage: number;
}

export interface ProgressStreamOptions {
  onProgress: (stats: ProgressStats) => void;
}

export class ProgressStream extends Transform {
  private transferred = 0;
  private total: number;
  private onProgress: (stats: ProgressStats) => void;

  constructor(total: number, options: ProgressStreamOptions) {
    super();
    this.total = total;
    this.onProgress = options.onProgress;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.transferred += chunk.length;

    const percentage = Math.round((this.transferred / this.total) * 100);

    this.onProgress({
      transferred: this.transferred,
      total: this.total,
      percentage: Math.min(percentage, 100),
    });

    this.push(chunk);
    callback();
  }
}
