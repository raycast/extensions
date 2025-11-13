/**
 * Terminal Manager Tests
 */

import { TerminalManager } from '@/services/terminalManager';

describe.skip('TerminalManager', () => {
  const testSessionId = 'test-session-123';

  afterEach(async () => {
    // Clean up all terminals after each test
    TerminalManager.cleanupSession(testSessionId);
    // Give a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('createTerminal', () => {
    it('should create a terminal and return a terminal ID', () => {
      const result = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['hello world']
      });

      expect(result.terminalId).toBeDefined();
      expect(result.terminalId).toMatch(/^term_/);
    });

    it('should create terminals with unique IDs', () => {
      const result1 = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['test1']
      });

      const result2 = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['test2']
      });

      expect(result1.terminalId).not.toBe(result2.terminalId);
    });
  });

  describe('getTerminalOutput', () => {
    it('should throw error for non-existent terminal', () => {
      expect(() => {
        TerminalManager.getTerminalOutput({
          sessionId: testSessionId,
          terminalId: 'non-existent'
        });
      }).toThrow('Terminal not found');
    });

    it('should throw error for wrong session ID', () => {
      const terminal = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['test']
      });

      expect(() => {
        TerminalManager.getTerminalOutput({
          sessionId: 'wrong-session',
          terminalId: terminal.terminalId
        });
      }).toThrow('does not belong to session');
    });
  });

  describe('waitForTerminalExit', () => {
    it('should wait for terminal to exit and return exit status', async () => {
      const terminal = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['test']
      });

      const exitStatus = await TerminalManager.waitForTerminalExit({
        sessionId: testSessionId,
        terminalId: terminal.terminalId
      });

      expect(exitStatus.exitCode).toBe(0);
      expect(exitStatus.signal).toBeNull();
    }, 5000);
  });

  describe('releaseTerminal', () => {
    it('should release a terminal and remove it from tracking', async () => {
      const terminal = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['test']
      });

      await TerminalManager.waitForTerminalExit({
        sessionId: testSessionId,
        terminalId: terminal.terminalId
      });

      TerminalManager.releaseTerminal({
        sessionId: testSessionId,
        terminalId: terminal.terminalId
      });

      // Should throw error after release
      expect(() => {
        TerminalManager.getTerminalOutput({
          sessionId: testSessionId,
          terminalId: terminal.terminalId
        });
      }).toThrow('Terminal not found');
    }, 5000);
  });

  describe('cleanupSession', () => {
    it('should clean up all terminals for a session', async () => {
      const terminal1 = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['test1']
      });

      const terminal2 = TerminalManager.createTerminal({
        sessionId: testSessionId,
        command: 'echo',
        args: ['test2']
      });

      // Wait for both to finish
      await Promise.all([
        TerminalManager.waitForTerminalExit({
          sessionId: testSessionId,
          terminalId: terminal1.terminalId
        }),
        TerminalManager.waitForTerminalExit({
          sessionId: testSessionId,
          terminalId: terminal2.terminalId
        })
      ]);

      TerminalManager.cleanupSession(testSessionId);

      // Both terminals should be gone
      expect(() => {
        TerminalManager.getTerminalOutput({
          sessionId: testSessionId,
          terminalId: terminal1.terminalId
        });
      }).toThrow('Terminal not found');

      expect(() => {
        TerminalManager.getTerminalOutput({
          sessionId: testSessionId,
          terminalId: terminal2.terminalId
        });
      }).toThrow('Terminal not found');
    }, 10000);
  });
});
