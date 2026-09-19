import { spawn } from 'child_process';
import { access, stat } from 'fs/promises';
import { dirname, extname, isAbsolute, join, resolve } from 'path';
import { getPreferenceValues } from '@raycast/api';
import { homedir } from 'os';

import {
  AudioOption,
  Framerate,
  MAX_AUDIO_SPEED,
  SpeedMultiplier,
} from './constants';

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface VideoInfo {
  hasAudio: boolean;
  duration: number;
}

/**
 * Raycast commands do not inherit the user's shell PATH, so a bare `ffmpeg`
 * usually will not resolve. Probe the common install locations too.
 */
const FFMPEG_CANDIDATES = [
  'ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  `${homedir()}/homebrew/bin/ffmpeg`,
  '/opt/local/bin/ffmpeg',
  '/usr/bin/ffmpeg',
];

/** Keep only recent diagnostics so long encodes do not grow memory indefinitely. */
function run(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout = (stdout + chunk.toString()).slice(-1024 * 1024);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-64 * 1024);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(stderr.trim() || `Command failed with exit code ${code}`)
        );
    });
  });
}

function preferredFfmpegPath(): string | undefined {
  return (
    getPreferenceValues<{ ffmpegPath?: string }>().ffmpegPath?.trim() ||
    undefined
  );
}

/** Trims float noise so 1/8 renders as "0.125" rather than "0.125000000001". */
function fmt(value: number): string {
  return String(Number(value.toFixed(6)));
}

/**
 * Keep each `atempo` factor within 0.5–2.0; larger changes are expressed
 * as a chain: 10x becomes atempo=2,atempo=2,atempo=2,atempo=1.25.
 */
function buildAtempoChain(speed: number): string {
  const filters: string[] = [];
  let remaining = speed;

  while (remaining > MAX_AUDIO_SPEED) {
    filters.push('atempo=2');
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${fmt(remaining)}`);

  return filters.join(',');
}

export class VideoProcessor {
  private ffmpegPath = 'ffmpeg';
  private ffprobePath = 'ffprobe';

  /** Locates a usable FFmpeg binary, caching the result on the instance. */
  async checkFfmpegAvailable(): Promise<void> {
    const configured = preferredFfmpegPath();
    const candidates = configured ? [configured] : FFMPEG_CANDIDATES;

    for (const candidate of candidates) {
      try {
        await run(candidate, ['-version']);
        this.ffmpegPath = candidate;
        this.ffprobePath = candidate.includes('/')
          ? join(dirname(candidate), 'ffprobe')
          : 'ffprobe';
        await run(this.ffprobePath, ['-version']);
        return;
      } catch {
        // Try the next location.
      }
    }

    throw new Error(
      'FFmpeg or ffprobe was not found. Install FFmpeg or check the FFmpeg Path preference.'
    );
  }

  private async probe(filePath: string): Promise<{
    streams?: { codec_type?: string }[];
    format?: { duration?: string };
  }> {
    const { stdout } = await run(this.ffprobePath, [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);
    return JSON.parse(stdout);
  }

  private async getVideoInfo(filePath: string): Promise<VideoInfo> {
    try {
      const info = await this.probe(filePath);
      const streams: Array<{ codec_type?: string }> = info.streams ?? [];

      if (!streams.some((stream) => stream.codec_type === 'video')) {
        throw new Error('No video stream found');
      }
      return {
        hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
        duration: parseFloat(info.format?.duration ?? '0'),
      };
    } catch {
      throw new Error('Failed to analyze video file');
    }
  }

  private buildFfmpegArgs(
    inputPath: string,
    outputPath: string,
    speed: SpeedMultiplier,
    framerate: Framerate,
    audio: AudioOption
  ): string[] {
    if (audio === 'remove') {
      return this.buildFfmpegArgsNoAudio(
        inputPath,
        outputPath,
        speed,
        framerate
      );
    }

    const speedValue = parseFloat(speed);
    const videoFilter = `[0:v:0]setpts=${fmt(1 / speedValue)}*PTS,fps=${framerate}[v]`;
    const audioFilter = `[0:a:0]${buildAtempoChain(speedValue)}[a]`;

    return [
      '-nostdin',
      '-n',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-filter_complex',
      `${videoFilter};${audioFilter}`,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      outputPath,
    ];
  }

  private buildFfmpegArgsNoAudio(
    inputPath: string,
    outputPath: string,
    speed: SpeedMultiplier,
    framerate: Framerate
  ): string[] {
    const speedValue = parseFloat(speed);

    return [
      '-nostdin',
      '-n',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-vf',
      `setpts=${fmt(1 / speedValue)}*PTS,fps=${framerate}`,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      outputPath,
    ];
  }

  private buildOutputPath(
    inputPath: string,
    speed: SpeedMultiplier,
    framerate: Framerate,
    audio: AudioOption
  ): string {
    const pathParts = inputPath.split('.');
    pathParts.pop();
    const basePath = pathParts.join('.');
    const audioSuffix = audio === 'remove' ? '_noaudio' : '';

    return `${basePath}_x${speed}_${framerate}fps${audioSuffix}.mp4`;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async processVideo(
    inputPath: string,
    speed: SpeedMultiplier,
    framerate: Framerate,
    audio: AudioOption,
    requestedOutputPath?: string
  ): Promise<string> {
    await this.checkFfmpegAvailable();

    inputPath = resolve(inputPath);
    if (
      !(await this.fileExists(inputPath)) ||
      !(await stat(inputPath)).isFile()
    ) {
      throw new Error('Input file does not exist');
    }

    const outputPath =
      requestedOutputPath?.trim() ||
      this.buildOutputPath(inputPath, speed, framerate, audio);
    if (!isAbsolute(outputPath))
      throw new Error('Output path must be absolute');
    if (
      !['.mp4', '.mov', '.mkv', '.m4v'].includes(
        extname(outputPath).toLowerCase()
      )
    ) {
      throw new Error('Use an MP4, MOV, MKV, or M4V output path');
    }
    if (await this.fileExists(outputPath)) {
      throw new Error(`Output file already exists: ${outputPath}`);
    }

    // A source without an audio track cannot be mapped through [0:a:0].
    const { hasAudio } = await this.getVideoInfo(inputPath);
    const effectiveAudio: AudioOption = hasAudio ? audio : 'remove';

    const args = this.buildFfmpegArgs(
      inputPath,
      outputPath,
      speed,
      framerate,
      effectiveAudio
    );

    try {
      await run(this.ffmpegPath, args);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `FFmpeg processing failed: ${detail.split('\n').slice(-3).join(' ')}`
      );
    }

    if (!(await this.fileExists(outputPath))) {
      throw new Error('FFmpeg processing failed: no output file was produced');
    }

    return outputPath;
  }

  async validateVideoFile(
    filePath: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.checkFfmpegAvailable();
      await this.getVideoInfo(filePath);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid video file',
      };
    }
  }
}

/** Resolves an FFmpeg binary, throwing if none is installed. */
export async function ensureFfmpegAvailable(): Promise<void> {
  await new VideoProcessor().checkFfmpegAvailable();
}
