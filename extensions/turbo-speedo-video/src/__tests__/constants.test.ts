import {
  SUPPORTED_EXTENSIONS,
  SPEED_OPTIONS,
  MAX_AUDIO_SPEED,
  FRAMERATE_OPTIONS,
  AUDIO_OPTIONS,
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
      expect(values).toContain('0.25');
      expect(values).toContain('0.5');
      expect(values).toContain('1');
      expect(values).toContain('2');
      expect(values).toContain('4');
      expect(values).toContain('8');
      expect(values).toContain('10');
      expect(values).toContain('40');
    });

    it('should have correct audio limit flags', () => {
      const audioLimits = SPEED_OPTIONS.map((option) => option.hasAudioLimit);
      expect(audioLimits).toContain(false); // Some speeds should not have audio limits
      expect(audioLimits).toContain(true); // Some speeds should have audio limits
    });

    it('should have descriptive labels', () => {
      SPEED_OPTIONS.forEach((option) => {
        expect(option.label).toContain(option.value);
        expect(option.label).toContain('x');
      });
    });
  });

  describe('FRAMERATE_OPTIONS', () => {
    it('should have correct framerate values', () => {
      const values = FRAMERATE_OPTIONS.map((option) => option.value);
      expect(values).toEqual(['24', '30', '60']);
    });

    it('should have descriptive labels', () => {
      FRAMERATE_OPTIONS.forEach((option) => {
        expect(option.label).toContain(option.value);
        expect(option.label).toContain('fps');
      });
    });
  });

  describe('AUDIO_OPTIONS', () => {
    it('should have correct audio option values', () => {
      const values = AUDIO_OPTIONS.map((option) => option.value);
      expect(values).toEqual(['keep', 'remove']);
    });

    it('should have descriptive labels', () => {
      AUDIO_OPTIONS.forEach((option) => {
        expect(option.label).toContain('Audio');
      });
    });
  });

  describe('MAX_AUDIO_SPEED', () => {
    it('should be 2.0', () => {
      expect(MAX_AUDIO_SPEED).toBe(2.0);
    });
  });
});
