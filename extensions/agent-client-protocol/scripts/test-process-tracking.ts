#!/usr/bin/env ts-node
/**
 * Manual test script for ProcessTracker
 *
 * Usage: npx ts-node scripts/test-process-tracking.ts
 */

import { ProcessTracker } from '../src/services/processTracker';
import { spawn } from 'child_process';

async function main() {
  console.log('=== ProcessTracker Manual Test ===\n');

  // Initialize
  console.log('1. Initializing ProcessTracker...');
  await ProcessTracker.initialize();
  console.log('   ✓ Initialized\n');

  // Check for existing processes
  console.log('2. Checking for existing tracked processes...');
  const existing = ProcessTracker.getAllProcesses();
  console.log(`   Found ${existing.length} tracked processes`);
  if (existing.length > 0) {
    existing.forEach(p => {
      console.log(`   - ${p.agentId}: PID ${p.pid}, Command: ${p.command}`);
    });
  }
  console.log('');

  // Register a test process
  console.log('3. Spawning and registering test process...');
  const testProcess = spawn('sleep', ['10']);
  if (!testProcess.pid) {
    console.error('   ✗ Failed to spawn process');
    return;
  }
  console.log(`   Spawned process with PID ${testProcess.pid}`);

  const testAgentId = 'test-agent-manual';
  ProcessTracker.registerProcess(testAgentId, testProcess.pid, 'sleep');
  console.log(`   ✓ Registered as agent: ${testAgentId}\n`);

  // Verify registration
  console.log('4. Verifying registration...');
  const registeredPid = ProcessTracker.getProcessPid(testAgentId);
  if (registeredPid === testProcess.pid) {
    console.log(`   ✓ Process correctly registered with PID ${registeredPid}\n`);
  } else {
    console.error(`   ✗ Registration failed. Expected ${testProcess.pid}, got ${registeredPid}\n`);
  }

  // List all processes
  console.log('5. Listing all tracked processes...');
  const allProcesses = ProcessTracker.getAllProcesses();
  console.log(`   Total: ${allProcesses.length} processes`);
  allProcesses.forEach(p => {
    console.log(`   - ${p.agentId}: PID ${p.pid}`);
  });
  console.log('');

  // Kill the process
  console.log('6. Killing test process...');
  const killed = ProcessTracker.killProcess(testAgentId);
  if (killed) {
    console.log('   ✓ Process killed successfully\n');
  } else {
    console.error('   ✗ Failed to kill process\n');
  }

  // Verify cleanup
  console.log('7. Verifying cleanup...');
  const afterKill = ProcessTracker.getProcessPid(testAgentId);
  if (afterKill === null) {
    console.log('   ✓ PID file cleaned up\n');
  } else {
    console.error(`   ✗ Cleanup failed. PID still registered: ${afterKill}\n`);
  }

  console.log('=== Test Complete ===');
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
