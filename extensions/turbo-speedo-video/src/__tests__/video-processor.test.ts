import { VideoProcessor } from '../utils/video-processor';

// Mock child_process
jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

const { execFile } = require('child_process');
const mockedExecFile = execFile as jest.MockedFunction<typeof execFile>;

describe('VideoProcessor', () => {
  let processor: VideoProcessor;

  beforeEach(() => {
    processor = new VideoProcessor();
    jest.clearAllMocks();
  });

  describe('checkFfmpegAvailable', () => {
    it('should pass when FFmpeg is available', async () => {
      mockedExecFile.mockResolvedValue({
        stdout: 'ffmpeg version 4.4.0',
        stderr: '',
      } as any);

      await expect(processor['checkFfmpegAvailable']()).resolves.not.toThrow();
    });

    it('should throw error when FFmpeg is not available', async () => {
      mockedExecFile.mockRejectedValue(new Error('Command not found'));

      await expect(processor['checkFfmpegAvailable']()).rejects.toThrow(
        'FFmpeg is not installed or not available in PATH'
      );
    });
  });

  describe('getVideoInfo', () => {
    it('should return video info for valid file', async () => {
      const mockInfo = {
        streams: [{ codec_type: 'video' }, { codec_type: 'audio' }],
        format: { duration: '120.5' },
      };

      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify(mockInfo),
        stderr: '',
      } as any);

      const result = await processor['getVideoInfo']('/path/to/video.mp4');

      expect(result).toEqual({
        hasAudio: true,
        duration: 120.5,
      });
    });

    it('should handle video without audio', async () => {
      const mockInfo = {
        streams: [{ codec_type: 'video' }],
        format: { duration: '60.0' },
      };

      mockedExecFile.mockResolvedValue({
        stdout: JSON.stringify(mockInfo),
        stderr: '',
      } as any);

      const result = await processor['getVideoInfo']('/path/to/video.mp4');

      expect(result).toEqual({
        hasAudio: false,
        duration: 60.0,
      });
    });

    it('should throw error for invalid file', async () => {
      mockedExecFile.mockRejectedValue(new Error('No such file'));

      await expect(
        processor['getVideoInfo']('/invalid/path.mp4')
      ).rejects.toThrow('Failed to analyze video file');
    });
  });

  describe('buildFfmpegCommand', () => {
    it('should build command for speed <= 2x with audio', () => {
      const command = processor['buildFfmpegCommand'](
        '/input.mp4',
        '/output.mp4',
        '2'
      );

      expect(command).toContain('setpts=0.5*PTS');
      expect(command).toContain('atempo=2');
      expect(command).toContain('-map');
      expect(command).toContain('[v]');
      expect(command).toContain('[a]');
    });

    it('should build command for speed > 2x with chained atempo filters', () => {
      const command = processor['buildFfmpegCommand'](
        '/input.mp4',
        '/output.mp4',
        '8'
      );

      expect(command).toContain('setpts=0.125*PTS');
      expect(command).toContain('atempo=2,atempo=2,atempo=2');
      expect(command).toContain('-map');
    });

    it('should build command for 10x speed with proper atempo chain', () => {
      const command = processor['buildFfmpegCommand'](
        '/input.mp4',
        '/output.mp4',
        '10'
      );

      expect(command).toContain('setpts=0.1*PTS');
      expect(command).toContain('atempo=2,atempo=2,atempo=2,atempo=1.25');
    });
  });

  describe('buildFfmpegCommandNoAudio', () => {
    it('should build command without audio', () => {
      const command = processor['buildFfmpegCommandNoAudio'](
        '/input.mp4',
        '/output.mp4',
        '4'
      );

      expect(command).toContain('setpts=0.25*PTS');
      expect(command).toContain('-an');
      expect(command).not.toContain('-map');
    });
  });

  describe('processVideo', () => {
    it('should process video successfully', async () => {
      // Mock all the execa calls in sequence
      mockedExecFile
        .mockResolvedValueOnce({
          stdout: 'ffmpeg version 4.4.0',
          stderr: '',
        } as any) // ffmpeg -version
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // test -f input
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // test -f output (file doesn't exist)
        .mockResolvedValueOnce({
          // ffprobe
          stdout: JSON.stringify({
            streams: [{ codec_type: 'video' }, { codec_type: 'audio' }],
            format: { duration: '120.0' },
          }),
          stderr: '',
        } as any)
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // ffmpeg processing
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any); // test -f output (verify created)

      const result = await processor.processVideo('/input.mp4', '2');

      expect(result).toBe('/input_x2.mp4');
      expect(mockedExecFile).toHaveBeenCalledWith('ffmpeg', expect.any(Array));
    });

    it('should throw error for non-existent input file', async () => {
      mockedExecFile
        .mockResolvedValueOnce({
          stdout: 'ffmpeg version 4.4.0',
          stderr: '',
        } as any) // ffmpeg -version
        .mockRejectedValueOnce(new Error('File not found')); // test -f input

      await expect(
        processor.processVideo('/nonexistent.mp4', '2')
      ).rejects.toThrow('Input file does not exist');
    });

    it('should throw error when output file already exists', async () => {
      mockedExecFile
        .mockResolvedValueOnce({
          stdout: 'ffmpeg version 4.4.0',
          stderr: '',
        } as any) // ffmpeg -version
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // test -f input
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any); // test -f output (file exists)

      await expect(processor.processVideo('/input.mp4', '2')).rejects.toThrow(
        'Output file already exists'
      );
    });

    it('should handle FFmpeg processing failure', async () => {
      mockedExecFile
        .mockResolvedValueOnce({
          stdout: 'ffmpeg version 4.4.0',
          stderr: '',
        } as any) // ffmpeg -version
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // test -f input
        .mockResolvedValueOnce({ stdout: '', stderr: '' } as any) // test -f output (file doesn't exist)
        .mockResolvedValueOnce({
          // ffprobe
          stdout: JSON.stringify({
            streams: [{ codec_type: 'video' }, { codec_type: 'audio' }],
            format: { duration: '120.0' },
          }),
          stderr: '',
        } as any)
        .mockRejectedValueOnce(new Error('FFmpeg processing failed')); // ffmpeg processing

      await expect(processor.processVideo('/input.mp4', '2')).rejects.toThrow(
        'FFmpeg processing failed'
      );
    });
  });

  describe('validateVideoFile', () => {
    it('should return valid for good video file', async () => {
      mockedExecFile
        .mockResolvedValueOnce({
          stdout: 'ffmpeg version 4.4.0',
          stderr: '',
        } as any) // ffmpeg -version
        .mockResolvedValueOnce({
          // ffprobe
          stdout: JSON.stringify({
            streams: [{ codec_type: 'video' }],
            format: { duration: '60.0' },
          }),
          stderr: '',
        } as any);

      const result = await processor.validateVideoFile('/valid.mp4');

      expect(result).toEqual({ valid: true });
    });

    it('should return invalid for bad video file', async () => {
      mockedExecFile
        .mockResolvedValueOnce({
          stdout: 'ffmpeg version 4.4.0',
          stderr: '',
        } as any) // ffmpeg -version
        .mockRejectedValueOnce(new Error('Invalid video file')); // ffprobe

      const result = await processor.validateVideoFile('/invalid.mp4');

      expect(result).toEqual({
        valid: false,
        error: 'Invalid video file',
      });
    });
  });
});
