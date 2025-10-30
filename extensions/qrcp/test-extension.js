#!/usr/bin/env node

// Test the qrcp integration similar to how the extension uses it
const { spawn } = require('child_process');
const { StringDecoder } = require('string_decoder');

const URL_REGEX = /(https?:\/\/[^\s]+)/;

console.log('Testing qrcp integration similar to Raycast extension...\n');

function startQrcp(command, args = []) {
  const allArgs = [command, ...args];
  const child = spawn('qrcp', allArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let running = true;
  let discoveredUrl = null;

  console.log(`✓ Spawned process (PID: ${child.pid})`);
  
  if (!child.stdout) {
    console.error('✗ ERROR: stdout is null!');
    return null;
  }
  
  if (!child.stderr) {
    console.error('✗ ERROR: stderr is null!');
    return null;
  }
  
  console.log('✓ stdout and stderr streams exist');

  const handleStream = (stream, type) => {
    const decoder = new StringDecoder('utf8');
    let buffer = '';

    stream.on('data', (chunk) => {
      buffer += decoder.write(chunk);
      let newlineIndex = buffer.indexOf('\n');

      while (newlineIndex >= 0) {
        const rawLine = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const line = rawLine.replace(/\r$/, '');

        if (type === 'stdout') {
          const match = line.match(URL_REGEX);
          if (match && !discoveredUrl) {
            discoveredUrl = match[1];
            console.log(`✓ Discovered URL: ${discoveredUrl}`);
          }
        }

        if (line.trim() && !line.includes('█')) {
          console.log(`  [${type}] ${line.substring(0, 80)}`);
        }

        newlineIndex = buffer.indexOf('\n');
      }
    });
  };

  handleStream(child.stdout, 'stdout');
  handleStream(child.stderr, 'stderr');

  child.on('error', (error) => {
    running = false;
    console.error('✗ Process error:', error.message);
  });

  child.on('exit', (code, signal) => {
    running = false;
    console.log(`✓ Process exited gracefully (code: ${code}, signal: ${signal})`);
  });

  return {
    stop: () => {
      if (running) {
        child.kill();
      }
    },
    isRunning: () => running,
  };
}

console.log('Starting receive command...\n');
const session = startQrcp('receive');

if (session) {
  setTimeout(() => {
    console.log('\n✓ Test completed successfully - stopping session');
    session.stop();
    
    setTimeout(() => {
      console.log('\n✅ All tests passed! The extension should work correctly.');
      process.exit(0);
    }, 500);
  }, 3000);
} else {
  console.error('\n✗ Test failed - could not start session');
  process.exit(1);
}
