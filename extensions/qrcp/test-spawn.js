#!/usr/bin/env node

// Simple test to reproduce the qrcp spawn issue
const { spawn } = require('child_process');

console.log('Testing qrcp spawn...');

const child = spawn('qrcp', ['receive'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

console.log('Process spawned, PID:', child.pid);
console.log('stdout exists:', !!child.stdout);
console.log('stderr exists:', !!child.stderr);

if (!child.stdout) {
  console.error('ERROR: stdout is null!');
  process.exit(1);
}

if (!child.stderr) {
  console.error('ERROR: stderr is null!');
  process.exit(1);
}

let hasOutput = false;

child.stdout.on('data', (chunk) => {
  hasOutput = true;
  console.log('[stdout]', chunk.toString());
});

child.stderr.on('data', (chunk) => {
  hasOutput = true;
  console.error('[stderr]', chunk.toString());
});

child.on('error', (error) => {
  console.error('Process error:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  console.log('Process exited:', { code, signal, hasOutput });
  if (!hasOutput) {
    console.error('WARNING: No output received from process!');
  }
  process.exit(code || 0);
});

// Stop after 5 seconds
setTimeout(() => {
  console.log('Stopping after 5 seconds...');
  child.kill();
}, 5000);
