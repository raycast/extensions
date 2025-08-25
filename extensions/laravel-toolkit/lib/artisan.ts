import { exec, ChildProcess } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { getPhpPath } from "./phpLocator";
import { sanitizePath } from "./pathValidator";

const execAsync = promisify(exec);

export interface ArtisanRunOptions {
  signal?: AbortSignal;
  timeout?: number;
}

// Track running processes for cleanup
const runningProcesses = new Set<ChildProcess>();

/**
 * Clean up all running processes
 */
export function cleanupRunningProcesses(): void {
  for (const process of runningProcesses) {
    try {
      if (!process.killed) {
        process.kill('SIGTERM');
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
      }
    } catch (error) {
      console.warn('Failed to kill process:', error);
    }
  }
  runningProcesses.clear();
}

export async function runArtisan(
  command: string, 
  cwd: string, 
  options: ArtisanRunOptions = {}
): Promise<string> {
  if (!cwd) {
    throw new Error("Project directory is required");
  }
  
  if (!command || typeof command !== "string") {
    throw new Error("Command is required and must be a string");
  }
  
  // Validate and sanitize paths
  const pathValidation = sanitizePath(cwd);
  if (!pathValidation.isValid) {
    throw new Error(`Invalid project directory: ${pathValidation.error}`);
  }
  
  const sanitizedCwd = pathValidation.sanitizedPath!;

  const artisanPath = join(sanitizedCwd, "artisan");
  if (!existsSync(artisanPath)) {
    throw new Error("artisan file not found. Make sure this is a Laravel project.");
  }

  // Check if vendor directory exists
  const vendorPath = join(sanitizedCwd, "vendor");
  if (!existsSync(vendorPath)) {
    throw new Error("Laravel dependencies not installed. Please run 'composer install' in your project directory first.");
  }

  // Check if vendor/autoload.php exists
  const autoloadPath = join(vendorPath, "autoload.php");
  if (!existsSync(autoloadPath)) {
    throw new Error("Laravel autoloader not found. Please run 'composer install' or 'composer dump-autoload' in your project directory.");
  }

  return new Promise<string>((resolve, reject) => {
    // Handle abortion
    if (options.signal?.aborted) {
      reject(new Error('Operation was cancelled'));
      return;
    }
    
    getPhpPath().then(phpPath => {
      const timeout = options.timeout ?? 60000; // Increased default timeout to 60 seconds
      
      // Escape command arguments to prevent injection
      const escapedCommand = command.replace(/["'\\;|&$`]/g, '\\$&');
      
      const childProcess = exec(
        `"${phpPath}" artisan ${escapedCommand}`,
        {
          cwd: sanitizedCwd,
          timeout,
          killSignal: 'SIGTERM'
        },
        (error, stdout, stderr) => {
          // Remove from tracking
          runningProcesses.delete(childProcess);
          
          if (error) {
            // Check if it's a timeout
            if (error.message.includes('timeout') || error.killed) {
              reject(new Error(`Command timed out after ${timeout}ms. For long-running operations, use the terminal instead.`));
              return;
            }
            
            // Check if it's a PHP not found error
            if (error.message.includes("not found") || error.message.includes("command not found")) {
              reject(new Error("PHP not found. Please install PHP or ensure it's in your PATH. You can install PHP using Homebrew: 'brew install php'"));
              return;
            }
            
            // Check for common Laravel setup issues
            if (error.message.includes("vendor/autoload.php") || error.message.includes("Failed to open stream")) {
              reject(new Error("Laravel dependencies not properly installed. Please run 'composer install' in your project directory."));
              return;
            }
            
            if (error.message.includes("No application encryption key")) {
              reject(new Error("Laravel application key not set. Please run 'php artisan key:generate' in your project directory."));
              return;
            }
            
            reject(new Error(`Artisan command failed: ${error.message}`));
            return;
          }
          
          if (stderr && stderr.trim()) {
            console.warn("Artisan command stderr:", stderr);
          }
          
          resolve(stdout);
        }
      );
      
      // Track the process for cleanup
      runningProcesses.add(childProcess);
      
      // Handle abortion
      const onAbort = () => {
        if (!childProcess.killed) {
          childProcess.kill('SIGTERM');
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGKILL');
            }
          }, 5000);
        }
        runningProcesses.delete(childProcess);
        reject(new Error('Operation was cancelled'));
      };
      
      if (options.signal) {
        if (options.signal.aborted) {
          onAbort();
          return;
        }
        options.signal.addEventListener('abort', onAbort, { once: true });
        
        // Clean up listener when process completes
        childProcess.on('exit', () => {
          options.signal?.removeEventListener('abort', onAbort);
        });
      }
    }).catch(reject);
  });
}
