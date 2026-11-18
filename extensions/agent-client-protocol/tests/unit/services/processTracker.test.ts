/**
 * Unit Tests for ProcessTracker
 *
 * Tests filesystem-based process tracking and cleanup
 */

import { ProcessTracker } from "@/services/processTracker";
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { environment } from '@raycast/api';

describe.skip("ProcessTracker", () => {
  const PROCESS_DIR = path.join(environment.supportPath, 'processes');

  beforeEach(async () => {
    // Reset and clean up before each test
    ProcessTracker.reset();

    // Clean up any existing test PID files
    if (fs.existsSync(PROCESS_DIR)) {
      const files = fs.readdirSync(PROCESS_DIR);
      for (const file of files) {
        if (file.endsWith('.pid')) {
          try {
            fs.unlinkSync(path.join(PROCESS_DIR, file));
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    }

    // Initialize tracker
    await ProcessTracker.initialize();
  });

  afterEach(() => {
    // Clean up test processes
    try {
      const processes = ProcessTracker.getAllProcesses();
      for (const proc of processes) {
        if (proc.agentId.startsWith('test-')) {
          ProcessTracker.killProcess(proc.agentId);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset after tests
    ProcessTracker.reset();
  });

  describe("initialization", () => {
    it("creates process directory if it doesn't exist", () => {
      expect(fs.existsSync(PROCESS_DIR)).toBe(true);
    });

    it("can be called multiple times safely", async () => {
      await ProcessTracker.initialize();
      await ProcessTracker.initialize();
      expect(fs.existsSync(PROCESS_DIR)).toBe(true);
    });
  });

  describe("process registration", () => {
    it("registers a process with PID file", () => {
      const agentId = "test-agent-1";
      const pid = process.pid; // Use current process PID for testing
      const command = "/usr/bin/test";

      ProcessTracker.registerProcess(agentId, pid, command);

      const retrievedPid = ProcessTracker.getProcessPid(agentId);
      expect(retrievedPid).toBe(pid);
    });

    it("unregisters a process and removes PID file", () => {
      const agentId = "test-agent-2";
      const pid = process.pid;
      const command = "/usr/bin/test";

      ProcessTracker.registerProcess(agentId, pid, command);
      expect(ProcessTracker.getProcessPid(agentId)).toBe(pid);

      ProcessTracker.unregisterProcess(agentId);
      expect(ProcessTracker.getProcessPid(agentId)).toBe(null);
    });

    it("returns null for non-existent process", () => {
      const pid = ProcessTracker.getProcessPid("non-existent-agent");
      expect(pid).toBe(null);
    });
  });

  describe("process lifecycle", () => {
    it("detects stale PID files for dead processes", () => {
      const agentId = "test-agent-stale";
      const fakePid = 999999; // Very unlikely to exist
      const command = "/usr/bin/test";

      ProcessTracker.registerProcess(agentId, fakePid, command);

      // Getting PID should detect process is dead and clean up
      const retrievedPid = ProcessTracker.getProcessPid(agentId);
      expect(retrievedPid).toBe(null);
    });

    it("kills a running process", () => {
      const agentId = "test-agent-kill";

      // Spawn a long-running process
      const testProcess = spawn('sleep', ['30']);

      if (!testProcess.pid) {
        throw new Error("Failed to spawn test process");
      }

      ProcessTracker.registerProcess(agentId, testProcess.pid, 'sleep');

      // Verify it's registered
      expect(ProcessTracker.getProcessPid(agentId)).toBe(testProcess.pid);

      // Kill it
      const killed = ProcessTracker.killProcess(agentId);
      expect(killed).toBe(true);

      // PID file should be cleaned up immediately
      const pid = ProcessTracker.getProcessPid(agentId);
      expect(pid).toBe(null);
    });
  });

  describe("getAllProcesses", () => {
    it("returns all tracked processes", () => {
      const agentId1 = "test-agent-list-1";
      const agentId2 = "test-agent-list-2";
      const pid = process.pid;

      ProcessTracker.registerProcess(agentId1, pid, "/usr/bin/test1");
      ProcessTracker.registerProcess(agentId2, pid, "/usr/bin/test2");

      const processes = ProcessTracker.getAllProcesses();
      const testProcesses = processes.filter(p => p.agentId.startsWith('test-agent-list'));

      expect(testProcesses.length).toBeGreaterThanOrEqual(2);
    });

    it("filters out stale processes", () => {
      const agentId = "test-agent-filter";
      const fakePid = 999998;

      ProcessTracker.registerProcess(agentId, fakePid, "/usr/bin/test");

      // getAllProcesses should detect dead process and clean up
      const processes = ProcessTracker.getAllProcesses();
      const found = processes.find(p => p.agentId === agentId);

      expect(found).toBeUndefined();
    });
  });
});
