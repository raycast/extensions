import { pasteClipboardAtPosition } from '../src/paste-utils';
import { Clipboard, showHUD, showToast } from '@raycast/api';

// Mock the Raycast API
jest.mock('@raycast/api');
const mockClipboard = Clipboard as jest.Mocked<typeof Clipboard>;
const mockShowHUD = showHUD as jest.MockedFunction<typeof showHUD>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

describe('Edge Cases for Direct Clipboard Access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Content Edge Cases', () => {
    it('should handle empty clipboard content', async () => {
      mockClipboard.readText.mockResolvedValue('');
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.readText).toHaveBeenCalledWith({ offset: 0 });
      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No clipboard content found at current position',
      });
    });

    it('should handle null clipboard content', async () => {
      mockClipboard.readText.mockResolvedValue(undefined);
      
      await pasteClipboardAtPosition(1, 'first');

      expect(mockClipboard.readText).toHaveBeenCalledWith({ offset: 1 });
      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No clipboard content found at first position',
      });
    });

    it('should handle whitespace-only content', async () => {
      mockClipboard.readText.mockResolvedValue('   \n\t   ');
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.readText).toHaveBeenCalledWith({ offset: 0 });
      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No clipboard content found at current position',
      });
    });

    it('should handle very large content', async () => {
      const largeContent = 'A'.repeat(10000);
      mockClipboard.readText.mockResolvedValue(largeContent);
      mockClipboard.paste.mockResolvedValue();
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).toHaveBeenCalledWith(largeContent);
      expect(mockShowHUD).toHaveBeenCalledWith('Pasted from current: ' + 'A'.repeat(30) + '...');
    });

    it('should handle unicode and special characters', async () => {
      const unicodeContent = '🚀 Hello 世界 ñoño 🎉';
      mockClipboard.readText.mockResolvedValue(unicodeContent);
      mockClipboard.paste.mockResolvedValue();
      
      await pasteClipboardAtPosition(2, 'third');

      expect(mockClipboard.paste).toHaveBeenCalledWith(unicodeContent);
      expect(mockShowHUD).toHaveBeenCalledWith('Pasted from third: 🚀 Hello 世界 ñoño 🎉');
    });
  });

  describe('Error Handling', () => {
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
      mockClipboard.readText.mockResolvedValue('test content');
      mockClipboard.paste.mockRejectedValue(new Error('Paste failed'));
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.readText).toHaveBeenCalledWith({ offset: 0 });
      expect(mockClipboard.paste).toHaveBeenCalledWith('test content');
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'Paste Failed',
        message: 'Failed to paste from current: Error: Paste failed',
      });
    });

    it('should handle HUD display errors gracefully', async () => {
      mockClipboard.readText.mockResolvedValue('test content');
      mockClipboard.paste.mockResolvedValue();
      mockShowHUD.mockRejectedValue(new Error('HUD failed'));
      
      await pasteClipboardAtPosition(0, 'current');

      expect(mockClipboard.paste).toHaveBeenCalledWith('test content');
      // Should not throw despite HUD error
    });
  });

  describe('High Offset Edge Cases', () => {
    it('should handle accessing beyond clipboard history', async () => {
      mockClipboard.readText.mockResolvedValue(undefined);
      
      await pasteClipboardAtPosition(10, 'position-10');

      expect(mockClipboard.readText).toHaveBeenCalledWith({ offset: 10 });
      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No clipboard content found at position-10 position',
      });
    });
  });
}); 