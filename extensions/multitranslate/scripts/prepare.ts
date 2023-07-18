import { execa } from 'execa'

(async () => {
  // Compile a native CLI to interact with the system dictionary
  await execa('swiftc', ['-o', 'spellcheck', 'spellcheck.swift'], { cwd: './assets' })
})()
