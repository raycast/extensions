import { Clipboard, showHUD, showToast } from '@raycast/api';

// Mock the Raycast API
jest.mock('@raycast/api');
const mockClipboard = Clipboard as jest.Mocked<typeof Clipboard>;
const mockShowHUD = showHUD as jest.MockedFunction<typeof showHUD>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

// Import all command functions
const importCommand = async (commandName: string) => {
  const module = await import(`../src/${commandName}.tsx`);
  return module.default;
};

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Command File Integration', () => {
    const commands = [
      { name: 'paste-current', offset: 0, expectedMessage: 'Pasted current:' },
      { name: 'paste-first', offset: 1, expectedMessage: 'Pasted 1st previous:' },
      { name: 'paste-second', offset: 2, expectedMessage: 'Pasted 2nd previous:' },
      { name: 'paste-third', offset: 3, expectedMessage: 'Pasted 3rd previous:' },
      { name: 'paste-fourth', offset: 4, expectedMessage: 'Pasted 4th previous:' },
      { name: 'paste-fifth', offset: 5, expectedMessage: 'Pasted 5th previous:' },
    ];

    commands.forEach(({ name, offset, expectedMessage }) => {
      it(`${name} should work with real clipboard data`, async () => {
        const testContent = `test-content-${offset}`;
        
        mockClipboard.readText.mockImplementation(({ offset: reqOffset = 0 } = {}) => {
          return Promise.resolve(reqOffset === offset ? testContent : `other-content-${reqOffset}`);
        });
        mockClipboard.paste.mockResolvedValue();

        const command = await importCommand(name);
        await command();

        expect(mockClipboard.readText).toHaveBeenCalledWith({ offset });
        expect(mockClipboard.paste).toHaveBeenCalledWith(testContent);
        expect(mockShowHUD).toHaveBeenCalledWith(`${expectedMessage} ${testContent}`);
      });
    });


  });

  describe('Real-world Scenarios', () => {
    it('should handle rapid sequential pastes without interference', async () => {
      const clipboardHistory = ['item0', 'item1', 'item2', 'item3'];
      
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        return Promise.resolve(clipboardHistory[offset] || null);
      });
      mockClipboard.paste.mockResolvedValue();

      // Simulate rapid command execution
      const commands = ['paste-current', 'paste-first', 'paste-second'];
      const results = await Promise.all(
        commands.map(async (cmdName, index) => {
          const command = await importCommand(cmdName);
          await command();
          return { cmdName, index };
        })
      );

      // Verify all commands executed correctly
      expect(mockClipboard.paste).toHaveBeenCalledTimes(3);
      expect(mockClipboard.paste).toHaveBeenNthCalledWith(1, 'item0');
      expect(mockClipboard.paste).toHaveBeenNthCalledWith(2, 'item1');
      expect(mockClipboard.paste).toHaveBeenNthCalledWith(3, 'item2');
    });

    it('should handle clipboard changes during command execution', async () => {
      let clipboardHistory = ['initial'];
      
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        return Promise.resolve(clipboardHistory[offset] || null);
      });
      mockClipboard.paste.mockResolvedValue();

      // First command with initial state
      const command1 = await importCommand('paste-current');
      await command1();
      
      expect(mockClipboard.paste).toHaveBeenCalledWith('initial');

      // Simulate clipboard change
      clipboardHistory = ['new-content', 'initial'];
      jest.clearAllMocks();

      // Second command with updated state
      const command2 = await importCommand('paste-current');
      await command2();
      
      expect(mockClipboard.paste).toHaveBeenCalledWith('new-content');
    });

    it('should handle mixed content types in clipboard history', async () => {
      const mixedContent = [
        'Simple text',
        '{"json": "data", "number": 123}',
        'Line 1\nLine 2\nLine 3',
        'https://example.com/path?param=value',
        '   whitespace content   ',
        '🚀 Emoji and unicode: 测试'
      ];
      
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        return Promise.resolve(mixedContent[offset] || null);
      });
      mockClipboard.paste.mockResolvedValue();

      // Test each content type
      for (let i = 0; i < mixedContent.length; i++) {
        const command = await importCommand(`paste-${i === 0 ? 'current' : ['first', 'second', 'third', 'fourth', 'fifth'][i-1]}`);
        await command();
        
        expect(mockClipboard.paste).toHaveBeenCalledWith(mixedContent[i]);
        jest.clearAllMocks();
      }
    });

    it('should handle repeating content across positions', async () => {
      const repeatingHistory = ['duplicate', 'unique', 'duplicate', 'other', 'duplicate'];
      
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        return Promise.resolve(repeatingHistory[offset] || null);
      });
      mockClipboard.paste.mockResolvedValue();

      // Test that each position returns its content regardless of duplication
      const testSequence = [
        { command: 'paste-current', expectedContent: 'duplicate' },
        { command: 'paste-first', expectedContent: 'unique' },
        { command: 'paste-second', expectedContent: 'duplicate' },
        { command: 'paste-third', expectedContent: 'other' },
        { command: 'paste-fourth', expectedContent: 'duplicate' }
      ];

      for (const { command: cmdName, expectedContent } of testSequence) {
        const command = await importCommand(cmdName);
        await command();
        
        expect(mockClipboard.paste).toHaveBeenCalledWith(expectedContent);
        jest.clearAllMocks();
      }
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle partial clipboard failures gracefully', async () => {
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        if (offset === 2) {
          throw new Error('Position 2 unavailable');
        }
        return Promise.resolve(`content-${offset}`);
      });
      mockClipboard.paste.mockResolvedValue();

      // Test successful positions
      const currentCommand = await importCommand('paste-current');
      await currentCommand();
      expect(mockClipboard.paste).toHaveBeenCalledWith('content-0');

      jest.clearAllMocks();

      const firstCommand = await importCommand('paste-first');  
      await firstCommand();
      expect(mockClipboard.paste).toHaveBeenCalledWith('content-1');

      jest.clearAllMocks();

      // Test failing position
      const secondCommand = await importCommand('paste-second');
      await secondCommand();
      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'Paste Failed',
        message: 'Could not paste the 2nd previous clipboard item',
      });
    });

    it('should handle system clipboard access denial', async () => {
      mockClipboard.readText.mockRejectedValue(new Error('Permission denied'));
      
      const command = await importCommand('paste-current');
      await command();

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'Paste Failed',
        message: 'Could not paste the current clipboard item',
      });
    });

    it('should handle empty clipboard gracefully', async () => {
      mockClipboard.readText.mockResolvedValue('');
      
      const command = await importCommand('paste-current');
      await command();

      expect(mockClipboard.paste).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith({
        style: 'failure',
        title: 'No Content',
        message: 'No content found at current clipboard position',
      });
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle multiple simultaneous command executions', async () => {
      const clipboardHistory = ['item0', 'item1', 'item2', 'item3', 'item4', 'item5'];
      
      mockClipboard.readText.mockImplementation(({ offset = 0 } = {}) => {
        // Simulate slight delay to test concurrency
        return new Promise(resolve => {
          setTimeout(() => resolve(clipboardHistory[offset] || null), 10);
        });
      });
      mockClipboard.paste.mockResolvedValue();

      // Execute multiple commands concurrently
      const commandPromises = [
        'paste-current',
        'paste-first', 
        'paste-second',
        'paste-third'
      ].map(async (cmdName) => {
        const command = await importCommand(cmdName);
        return command();
      });

      await Promise.all(commandPromises);

      // Verify all commands completed
      expect(mockClipboard.paste).toHaveBeenCalledTimes(4);
      expect(mockClipboard.readText).toHaveBeenCalledTimes(4);
    });


  });
}); 