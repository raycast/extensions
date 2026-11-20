// Offscreen native renderer check. No application UI or Raycast integration.
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { PNG } from 'pngjs';
import { generatePng, toSwiftUI } from '../src/lib/grad';
import { Gradient } from '../src/types';

async function main() {
  if (process.platform !== 'darwin')
    throw new Error('Requires macOS and the Swift command-line tools');
  const directory = await mkdtemp(path.join(tmpdir(), 'gradient-swift-'));
  try {
    const cases: Gradient[] = [0, 90, 180, 270, 360, 13].map((angle) => ({
      type: 'linear',
      angle,
      stops: ['#000', '#FFF'],
    }));
    cases.push(
      { type: 'radial', stops: ['#000', '#FFF'] },
      { type: 'conic', stops: ['#000', '#FFF'] },
    );
    for (const type of ['linear', 'radial', 'conic'] as const)
      cases.push({ type, angle: 45, stops: ['#F00', '#0F0', '#00F'] });
    const views = cases
      .map((g, i) =>
        toSwiftUI(g).replace(
          'struct GeneratedGradient:',
          `struct Gradient${i}:`,
        ),
      )
      .join('\n');
    const render = cases
      .map((_, i) => `try save(Gradient${i}(), name: "${i}")`)
      .join('\n');
    const source = `${views}
import AppKit
@main struct Verify {
    @MainActor static func main() throws {
        func save<V: View>(_ view: V, name: String) throws {
            let renderer = ImageRenderer(content: view.frame(width: 32, height: 16))
            renderer.scale = 1
            guard let image = renderer.cgImage else { fatalError("Rendering failed") }
            let bitmap = NSBitmapImageRep(cgImage: image)
            let data = bitmap.representation(using: .png, properties: [:])!
            try data.write(to: URL(fileURLWithPath: CommandLine.arguments[1]).appendingPathComponent(name + ".png"))
        }
        ${render}
    }
}`;
    const file = path.join(directory, 'verify.swift'),
      executable = path.join(directory, 'verify');
    await writeFile(file, source);
    execFileSync('swiftc', ['-parse-as-library', file, '-o', executable]);
    execFileSync(executable, [directory]);
    for (let i = 0; i < cases.length; i++) {
      const native = PNG.sync.read(
        await readFile(path.join(directory, `${i}.png`)),
      );
      const reference = PNG.sync.read(generatePng(cases[i], 32, 16));
      assert.equal(native.width, 32);
      assert.equal(native.height, 16);
      let maximum = 0;
      for (let p = 0; p < native.data.length; p++)
        maximum = Math.max(
          maximum,
          Math.abs(native.data[p] - reference.data[p]),
        );
      console.log(
        `${cases[i].type} ${cases[i].angle ?? ''}: max channel difference ${maximum}/255`,
      );
      assert.ok(
        maximum <= 3,
        `Native rendering differs from reference by ${maximum}/255`,
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
