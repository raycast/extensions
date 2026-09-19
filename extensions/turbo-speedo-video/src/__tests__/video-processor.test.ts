/** @jest-environment node */
import { execFileSync } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { getPreferenceValues } from '@raycast/api';
import { VideoProcessor } from '../utils/video-processor';

jest.mock('@raycast/api', () => ({ getPreferenceValues: jest.fn(() => ({})) }));

// These integration tests exercise the actual FFmpeg process and generated media.
describe('VideoProcessor with FFmpeg', () => {
  let directory: string;
  let input: string;
  let processor: VideoProcessor;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'turbo-speedo-'));
    input = join(directory, "source with spaces and 'quotes'.mp4");
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=64x64:rate=30',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440',
      '-t',
      '4',
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      input,
    ]);
  });
  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  beforeEach(() => {
    jest.mocked(getPreferenceValues).mockReturnValue({});
    processor = new VideoProcessor();
  });

  function probe(path: string) {
    return JSON.parse(
      execFileSync(
        'ffprobe',
        ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
        { encoding: 'utf8' }
      )
    ) as {
      streams: { codec_type: string; r_frame_rate: string }[];
      format: { duration: string };
    };
  }

  it.each(['0.25', '2', '10', '40'] as const)(
    'encodes %sx video and synchronized audio',
    async (speed) => {
      const output = await processor.processVideo(input, speed, '30', 'keep');
      const info = probe(output);
      expect(info.streams.map((s) => s.codec_type)).toEqual(['video', 'audio']);
      expect(info.streams[0].r_frame_rate).toBe('30/1');
      expect(
        Math.abs(Number(info.format.duration) - 4 / Number(speed))
      ).toBeLessThan(0.3);
    }
  );

  it('honors the custom output path and removes audio', async () => {
    const output = join(directory, 'custom output.mp4');
    expect(
      await processor.processVideo(input, '1', '60', 'remove', output)
    ).toBe(output);
    const info = probe(output);
    expect(info.streams.map((s) => s.codec_type)).toEqual(['video']);
    expect(info.streams[0].r_frame_rate).toBe('60/1');
  });

  it('processes a silent video with Keep Audio selected', async () => {
    const silent = join(directory, 'silent source.mp4');
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-i',
      input,
      '-an',
      '-c:v',
      'copy',
      silent,
    ]);
    await processor.processVideo(silent, '1', '24', 'keep');
    expect(
      probe(join(directory, 'silent source_x1_24fps.mp4')).streams
    ).toHaveLength(1);
  });

  it('refuses to overwrite an existing file', async () => {
    const output = join(directory, 'existing.mp4');
    await writeFile(output, 'do not overwrite');
    await expect(
      processor.processVideo(input, '1', '30', 'keep', output)
    ).rejects.toThrow('Output file already exists');
    expect(await readFile(output, 'utf8')).toBe('do not overwrite');
  });

  it('rejects missing inputs and incompatible output containers', async () => {
    await expect(
      processor.processVideo(join(directory, 'missing.mp4'), '1', '30', 'keep')
    ).rejects.toThrow('Input file does not exist');
    await expect(
      processor.processVideo(
        input,
        '1',
        '30',
        'keep',
        join(directory, 'output.webm')
      )
    ).rejects.toThrow('output path');
  });

  it('honors a configured FFmpeg path', async () => {
    jest
      .mocked(getPreferenceValues)
      .mockReturnValue({ ffmpegPath: '/missing/custom/ffmpeg' });
    await expect(processor.checkFfmpegAvailable()).rejects.toThrow(
      'FFmpeg or ffprobe was not found'
    );
  });
});
