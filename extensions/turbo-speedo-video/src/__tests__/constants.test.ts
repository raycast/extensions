import {
  SUPPORTED_EXTENSIONS,
  SPEED_OPTIONS,
  MAX_AUDIO_SPEED,
} from '../utils/constants';

describe('Constants', () => {
  describe('SUPPORTED_EXTENSIONS', () => {
    it('should contain common video formats', () => {
      expect(SUPPORTED_EXTENSIONS).toContain('mp4');
      expect(SUPPORTED_EXTENSIONS).toContain('mov');
      expect(SUPPORTED_EXTENSIONS).toContain('avi');
      expect(SUPPORTED_EXTENSIONS).toContain('mkv');
      expect(SUPPORTED_EXTENSIONS).toContain('webm');
    });

    it('should not contain non-video formats', () => {
      expect(SUPPORTED_EXTENSIONS).not.toContain('txt');
      expect(SUPPORTED_EXTENSIONS).not.toContain('pdf');
      expect(SUPPORTED_EXTENSIONS).not.toContain('jpg');
    });
  });

  describe('SPEED_OPTIONS', () => {
    it('should have correct speed values', () => {
      const values = SPEED_OPTIONS.map((option) => option.value);
      expect(values).toEqual(['0.5', '1', '2', '4', '8', '10']);
    });

    it('should have correct audio limit flags', () => {
      const audioLimits = SPEED_OPTIONS.map((option) => option.hasAudioLimit);
      expect(audioLimits).toEqual([false, false, false, true, true, true]);
    });

    it('should have descriptive labels', () => {
      SPEED_OPTIONS.forEach((option) => {
        expect(option.label).toContain(option.value);
        expect(option.label).toContain('x');
      });
    });
  });

  describe('MAX_AUDIO_SPEED', () => {
    it('should be 2.0', () => {
      expect(MAX_AUDIO_SPEED).toBe(2.0);
    });
  });
});
