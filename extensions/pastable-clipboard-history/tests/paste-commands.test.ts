import { pasteClipboardAtPosition } from '../src/paste-utils';
import { Clipboard, showHUD, showToast } from '@raycast/api';

// Mock the Raycast API
jest.mock('@raycast/api');
const mockClipboard = Clipboard as jest.Mocked<typeof Clipboard>;
const mockShowHUD = showHUD as jest.MockedFunction<typeof showHUD>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe('Paste Commands Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Operations', () => {
    it('should paste from each position correctly', async () => {
      const clipboardHistory = ['current', 'first', 'second', 'third', 'fourth', 'fifth'];
      
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        return Promise.resolve(clipboardHistory[offset] || undefined);
      });
      mockClipboard.paste.mockResolvedValue();

      for (let i = 0; i < 6; i++) {
        await pasteClipboardAtPosition(i, `position-${i}`);
        
        expect(mockClipboard.readText).toHaveBeenCalledWith({ offset: i });
        expect(mockClipboard.paste).toHaveBeenCalledWith(clipboardHistory[i]);
        expect(mockShowHUD).toHaveBeenCalledWith(`Pasted from position-${i}: ${clipboardHistory[i]}`);
        
        jest.clearAllMocks();
      }
    });

    it('should handle long content with preview truncation', async () => {
      const longContent = 'A'.repeat(50);
      const expectedPreview = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...';
      
      mockClipboard.readText.mockResolvedValue(longContent);
      mockClipboard.paste.mockResolvedValue();

      await pasteClipboardAtPosition(0, 'current');

      expect(mockShowHUD).toHaveBeenCalledWith(`Pasted from current: ${expectedPreview}`);
    });
  });

  describe('Repeating Content Scenarios', () => {
    it('should handle duplicate content in different positions', async () => {
      mockClipboard.readText.mockResolvedValue('duplicate');
      mockClipboard.paste.mockResolvedValue();

      await pasteClipboardAtPosition(0, 'current');
      expect(mockClipboard.paste).toHaveBeenCalledWith('duplicate');
      expect(mockShowHUD).toHaveBeenCalledWith('Pasted from current: duplicate');

      jest.clearAllMocks();

      await pasteClipboardAtPosition(1, 'first');
      expect(mockClipboard.paste).toHaveBeenCalledWith('duplicate');
      expect(mockShowHUD).toHaveBeenCalledWith('Pasted from first: duplicate');
    });

    it('should handle all positions having identical content', async () => {
      const identicalContent = 'same-content';
      
      mockClipboard.readText.mockResolvedValue(identicalContent);
      mockClipboard.paste.mockResolvedValue();

      for (let i = 0; i < 6; i++) {
        await pasteClipboardAtPosition(i, `position-${i}`);
        
        expect(mockClipboard.readText).toHaveBeenCalledWith({ offset: i });
        
        expect(mockClipboard.paste).toHaveBeenCalledWith(identicalContent);
        expect(mockShowHUD).toHaveBeenCalledWith(`Pasted from position-${i}: ${identicalContent}`);
        
        jest.clearAllMocks();
      }
    });

    it('should handle alternating repeated patterns', async () => {
      const alternatingHistory = ['A', 'B', 'A', 'B', 'A', 'B'];
      
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        return Promise.resolve(alternatingHistory[offset] || undefined);
      });
      mockClipboard.paste.mockResolvedValue();

      for (let i = 0; i < 6; i++) {
        await pasteClipboardAtPosition(i, `position-${i}`);
        
        expect(mockClipboard.paste).toHaveBeenCalledWith(alternatingHistory[i]);
        expect(mockShowHUD).toHaveBeenCalledWith(`Pasted from position-${i}: ${alternatingHistory[i]}`);
        
        jest.clearAllMocks();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      mockClipboard.readText.mockResolvedValue('');
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No clipboard content found at current position',
      });
    });

    it('should handle whitespace-only content', async () => {
      mockClipboard.readText.mockResolvedValue('   \n\t   ');
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No clipboard content found at current position',
      });
    });

    it('should handle null content', async () => {
      mockClipboard.readText.mockResolvedValue(undefined);
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No clipboard content found at current position',
      });
    });

    it('should handle clipboard read errors', async () => {
      mockClipboard.readText.mockRejectedValue(new Error('Clipboard access denied'));
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'Paste Failed',
        message: 'Failed to paste from current: Error: Clipboard access denied',
      });
    });

    it('should handle paste operation errors', async () => {
      mockClipboard.readText.mockResolvedValue('valid content');
      mockClipboard.paste.mockRejectedValue(new Error('Paste operation failed'));
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.readText).toHaveBeenCalled();
      expect(mockClipboard.paste).toHaveBeenCalledWith('valid content');
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'Paste Failed',
        message: 'Failed to paste from current: Error: Paste operation failed',
      });
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle unicode and special characters', async () => {
      const specialContent = '🎉 Unicode: 你好 Emoji: 🚀 Special: ñáéíóú';
      mockClipboard.readText.mockResolvedValue(specialContent);
      mockClipboard.paste.mockResolvedValue();
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).toHaveBeenCalledWith(specialContent);
      expect(mockShowHUD).toHaveBeenCalledWith(`Pasted from current: ${specialContent.substring(0, 30)}...`);
    });

    it('should handle newlines and formatting', async () => {
      const multilineContent = 'Line 1\nLine 2\r\nLine 3\tTabbed';
      mockClipboard.readText.mockResolvedValue(multilineContent);
      mockClipboard.paste.mockResolvedValue();
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).toHaveBeenCalledWith(multilineContent);
      expect(mockShowHUD).toHaveBeenCalledWith(`Pasted from current: ${multilineContent}`);
    });

    it('should handle very long content with proper truncation', async () => {
      const veryLongContent = 'A'.repeat(1000);
      const expectedPreview = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...';
      mockClipboard.readText.mockResolvedValue(veryLongContent);
      mockClipboard.paste.mockResolvedValue();
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).toHaveBeenCalledWith(veryLongContent);
      expect(mockShowHUD).toHaveBeenCalledWith(`Pasted from current: ${expectedPreview}`);
    });
  });

  describe('Clipboard History Boundaries', () => {
    it('should handle accessing beyond available history', async () => {
      // Simulate clipboard with only 3 items, but trying to access position 5
      mockClipboard.readText.mockRejectedValue(new Error('Invalid offset: the maximum value is 2'));
      
      await pasteClipboardAtPosition(5, 'fifth');

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'Paste Failed',
        message: 'Failed to paste from fifth: Error: Invalid offset: the maximum value is 2',
      });
    });

    it('should handle empty clipboard history', async () => {
      mockClipboard.readText.mockRejectedValue(new Error('Invalid offset: the maximum value is -1'));
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'Paste Failed',
        message: 'Failed to paste from current: Error: Invalid offset: the maximum value is -1',
      });
    });
  });
}); 