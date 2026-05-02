import cp from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function execFileText(cmd, args, opts = {}) {
  return cp.execFileSync(cmd, args, { encoding: 'utf8', ...opts });
}

function execJSON(cmd, args, opts = {}) {
  const out = execFileText(cmd, args, opts);
  return JSON.parse(out);
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function copyFile(src, dst) {
  await fsp.copyFile(src, dst);
  await fsp.chmod(dst, 0o755);
  if (process.platform === 'darwin') {
    try {
      cp.execFileSync('xattr', ['-cr', dst]);
    } catch (e) {
      console.warn(`[native] Warning: failed to clear xattr on ${dst}: ${e.message}`);
    }
    try {
      cp.execFileSync('codesign', ['--force', '--sign', '-', dst]);
      console.log(`[native] Ad-hoc signed ${path.basename(dst)}`);
    } catch (e) {
      console.warn(`[native] Warning: failed to codesign ${dst}: ${e.message}`);
    }
  }
}

function cargoExists() {
  try {
    const res = cp.spawnSync('cargo', ['--version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

function detectHostTarget() {
  try {
    const out = execFileText('rustc', ['-vV']);
    const line = out.split('\n').find((l) => l.startsWith('host: '));
    return line ? line.replace('host: ', '').trim() : undefined;
  } catch {
    return undefined;
  }
}

// (profile handling removed by request; always build release)

(async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '..');
  const nativeDir = path.join(repoRoot, 'native');
  const assetsDir = path.join(repoRoot, 'assets');
  const explicitTarget = process.env.TARGET || process.env.CARGO_BUILD_TARGET;
  const hostTarget = detectHostTarget();

  if (!cargoExists()) {
    console.error('[native] Cargo was not found in your PATH.');
    console.error('[native] Please install Rust and Cargo using rustup: https://rustup.rs');
    console.error('[native] Then re-run: npm run build:native');
    process.exit(1);
  }

  await ensureDir(assetsDir);

  console.log('[native] Starting build');
  if (explicitTarget) {
    console.log(`[native] Target (env): ${explicitTarget}`);
  }
  if (hostTarget) {
    console.log(`[native] Host target: ${hostTarget}`);
  }

  const buildArgs = ['build', '--bins', '--release'];
  console.log(`[native] Running: cargo ${buildArgs.join(' ')} (cwd: ${nativeDir})`);
  await run('cargo', buildArgs, { cwd: nativeDir });

  const meta = execJSON('cargo', ['metadata', '--format-version', '1', '--no-deps'], { cwd: nativeDir });

  const manifest = path.join(nativeDir, 'Cargo.toml');
  const pkg = meta.packages.find((p) => path.resolve(p.manifest_path) === path.resolve(manifest));
  if (!pkg) {
    throw new Error('Could not locate native package in cargo metadata');
  }

  const targetDir = meta.target_directory;
  const binTargets = pkg.targets.filter((t) => t.kind && t.kind.includes('bin'));
  const binNames = binTargets.map((t) => t.name);
  console.log(`[native] Discovered binaries: ${binNames.length ? binNames.join(', ') : '(none)'}`);

  for (const t of binTargets) {
    const name = t.name;
    const dst = path.join(assetsDir, name);
    const profileDir = 'release';
    const candidates = [path.join(targetDir, profileDir, name)];
    if (explicitTarget) {
      candidates.push(path.join(targetDir, explicitTarget, profileDir, name));
    }
    if (hostTarget) {
      candidates.push(path.join(targetDir, hostTarget, profileDir, name));
    }

    const src = candidates.find((p) => fs.existsSync(p));
    if (!src) {
      throw new Error(`Built binary not found for ${name}. Tried: ${candidates.join(', ')}`);
    }

    console.log(`[native] Copying ${name} from ${src}`);
    await copyFile(src, dst);
    console.log(`[native] Copied ${name} -> assets/`);
  }
})().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
