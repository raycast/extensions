/**
 * Process Tracker - Filesystem-based Process Management
 *
 * Tracks agent subprocesses using PID files in /tmp to survive extension reloads.
 * Automatically cleans up orphaned processes on startup.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createLogger } from '@/utils/logging';

const logger = createLogger('ProcessTracker');

interface ProcessInfo {
  pid: number;
  agentId: string;
  command: string;
  startedAt: number;
}

export class ProcessTracker {
  private static readonly PROCESS_DIR = path.join(os.tmpdir(), 'raycast-acp-processes');
  private static initialized = false;

  /**
   * Initialize the process tracker and clean up orphaned processes
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create process directory if it doesn't exist
      if (!fs.existsSync(this.PROCESS_DIR)) {
        fs.mkdirSync(this.PROCESS_DIR, { recursive: true, mode: 0o755 });
        logger.info('Created process tracking directory', { dir: this.PROCESS_DIR });
      }

      // Clean up stale PID files and orphaned processes
      await this.cleanupOrphanedProcesses();

      this.initialized = true;
      logger.info('Process tracker initialized');
    } catch (error) {
      logger.error('Failed to initialize process tracker', { error });
      throw error;
    }
  }

  /**
   * Register a running process
   */
  static registerProcess(agentId: string, pid: number, command: string): void {
    try {
      const processInfo: ProcessInfo = {
        pid,
        agentId,
        command,
        startedAt: Date.now()
      };

      const pidFile = this.getPidFilePath(agentId);
      fs.writeFileSync(pidFile, JSON.stringify(processInfo, null, 2), { mode: 0o644 });

      logger.info('Registered process', { agentId, pid, pidFile });
    } catch (error) {
      logger.error('Failed to register process', { agentId, pid, error });
    }
  }

  /**
   * Unregister a process (when cleanly shut down)
   */
  static unregisterProcess(agentId: string): void {
    try {
      const pidFile = this.getPidFilePath(agentId);
      if (fs.existsSync(pidFile)) {
        fs.unlinkSync(pidFile);
        logger.info('Unregistered process', { agentId, pidFile });
      }
    } catch (error) {
      logger.error('Failed to unregister process', { agentId, error });
    }
  }

  /**
   * Get the PID of a registered process
   */
  static getProcessPid(agentId: string): number | null {
    try {
      const pidFile = this.getPidFilePath(agentId);
      if (!fs.existsSync(pidFile)) {
        return null;
      }

      const content = fs.readFileSync(pidFile, 'utf-8');
      const processInfo: ProcessInfo = JSON.parse(content);

      // Verify process is still running
      if (this.isProcessRunning(processInfo.pid)) {
        return processInfo.pid;
      } else {
        // Process died, clean up stale PID file
        logger.info('Found stale PID file, cleaning up', { agentId, pid: processInfo.pid });
        this.unregisterProcess(agentId);
        return null;
      }
    } catch (error) {
      logger.warn('Failed to get process PID', { agentId, error });
      return null;
    }
  }

  /**
   * Kill a tracked process
   */
  static killProcess(agentId: string): boolean {
    try {
      const pid = this.getProcessPid(agentId);
      if (!pid) {
        logger.debug('No process to kill', { agentId });
        return false;
      }

      logger.info('Killing process', { agentId, pid });

      // Try graceful termination first (SIGTERM)
      try {
        process.kill(pid, 'SIGTERM');
        logger.info('Sent SIGTERM to process', { agentId, pid });

        // Unregister immediately - process will die soon
        this.unregisterProcess(agentId);
        return true;
      } catch (error) {
        // Process might already be dead
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
          logger.info('Process already dead', { agentId, pid });
          this.unregisterProcess(agentId);
          return true;
        }

        // If SIGTERM fails for other reason, try SIGKILL
        logger.warn('SIGTERM failed, trying SIGKILL', { agentId, pid, error });
        try {
          process.kill(pid, 'SIGKILL');
          this.unregisterProcess(agentId);
          return true;
        } catch (killError) {
          if ((killError as NodeJS.ErrnoException).code === 'ESRCH') {
            this.unregisterProcess(agentId);
            return true;
          }
          throw killError;
        }
      }
    } catch (error) {
      logger.error('Failed to kill process', { agentId, error });
      return false;
    }
  }

  /**
   * Clean up orphaned processes from previous sessions
   */
  private static async cleanupOrphanedProcesses(): Promise<void> {
    try {
      if (!fs.existsSync(this.PROCESS_DIR)) {
        return;
      }

      const files = fs.readdirSync(this.PROCESS_DIR);
      const pidFiles = files.filter(f => f.endsWith('.pid'));

      logger.info('Checking for orphaned processes', { count: pidFiles.length });

      let cleaned = 0;
      let killed = 0;

      for (const file of pidFiles) {
        try {
          const pidFile = path.join(this.PROCESS_DIR, file);
          const content = fs.readFileSync(pidFile, 'utf-8');
          const processInfo: ProcessInfo = JSON.parse(content);

          if (this.isProcessRunning(processInfo.pid)) {
            // Process is still running - kill it
            logger.info('Found orphaned process, killing', {
              agentId: processInfo.agentId,
              pid: processInfo.pid,
              uptime: Date.now() - processInfo.startedAt
            });

            try {
              process.kill(processInfo.pid, 'SIGTERM');
              killed++;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
                logger.warn('Failed to kill orphaned process', {
                  pid: processInfo.pid,
                  error
                });
              }
            }
          }

          // Remove PID file
          fs.unlinkSync(pidFile);
          cleaned++;
        } catch (error) {
          logger.warn('Failed to process PID file', { file, error });
        }
      }

      logger.info('Orphaned process cleanup complete', { cleaned, killed });
    } catch (error) {
      logger.error('Failed to cleanup orphaned processes', { error });
    }
  }

  /**
   * Check if a process is running
   */
  private static isProcessRunning(pid: number): boolean {
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the path to a PID file for an agent
   */
  private static getPidFilePath(agentId: string): string {
    // Sanitize agent ID for use in filename
    const sanitized = agentId.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.PROCESS_DIR, `${sanitized}.pid`);
  }

  /**
   * Get all tracked processes
   */
  static getAllProcesses(): ProcessInfo[] {
    try {
      if (!fs.existsSync(this.PROCESS_DIR)) {
        return [];
      }

      const files = fs.readdirSync(this.PROCESS_DIR);
      const pidFiles = files.filter(f => f.endsWith('.pid'));

      const processes: ProcessInfo[] = [];
      for (const file of pidFiles) {
        try {
          const pidFile = path.join(this.PROCESS_DIR, file);
          const content = fs.readFileSync(pidFile, 'utf-8');
          const processInfo: ProcessInfo = JSON.parse(content);

          // Only include running processes
          if (this.isProcessRunning(processInfo.pid)) {
            processes.push(processInfo);
          } else {
            // Clean up stale PID file
            fs.unlinkSync(pidFile);
          }
        } catch (error) {
          logger.warn('Failed to read PID file', { file, error });
        }
      }

      return processes;
    } catch (error) {
      logger.error('Failed to get all processes', { error });
      return [];
    }
  }
}
