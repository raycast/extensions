import { spawn } from 'child_process';

/**
 * Converts CMU pronouncing format (e.g. "HH AE1 P IY0") into readable IPA or phonetics
 */
export function formatPhonetic(raw?: string): string | undefined {
  if (!raw) return undefined;

  let cleaned = raw.trim();
  if (cleaned.startsWith('pron:')) {
    cleaned = cleaned.replace(/^pron:/, '').trim();
  }

  // If it already looks like IPA with slashes or brackets
  if (cleaned.startsWith('/') || cleaned.startsWith('[')) {
    return cleaned;
  }

  // CMU phoneme to rough IPA mapping
  const cmuToIpa: Record<string, string> = {
    AA: 'ɑ',
    AE: 'æ',
    AH: 'ʌ',
    AO: 'ɔ',
    AW: 'aʊ',
    AY: 'aɪ',
    B: 'b',
    CH: 'tʃ',
    D: 'd',
    DH: 'ð',
    EH: 'ɛ',
    ER: 'ɜr',
    EY: 'eɪ',
    F: 'f',
    G: 'ɡ',
    HH: 'h',
    IH: 'ɪ',
    IY: 'i',
    JH: 'dʒ',
    K: 'k',
    L: 'l',
    M: 'm',
    N: 'n',
    NG: 'ŋ',
    OW: 'oʊ',
    OY: 'ɔɪ',
    P: 'p',
    R: 'r',
    S: 's',
    SH: 'ʃ',
    T: 't',
    TH: 'θ',
    UH: 'ʊ',
    UW: 'u',
    V: 'v',
    W: 'w',
    Y: 'j',
    Z: 'z',
    ZH: 'ʒ',
  };

  const tokens = cleaned.split(/\s+/);
  let hasStress = false;
  const ipaTokens = tokens.map((token) => {
    const stressMatch = token.match(/\d$/);
    const stress = stressMatch ? stressMatch[0] : '';
    const base = token.replace(/\d$/, '');
    const ipa = cmuToIpa[base] || base.toLowerCase();

    if (stress === '1') {
      hasStress = true;
      return `'${ipa}`;
    }
    if (stress === '2') {
      return `ˌ${ipa}`;
    }
    return ipa;
  });

  const joined = ipaTokens.join('');
  return `/${joined}/`;
}

/**
 * Pronounces a word using native OS speech synthesis (works 100% offline).
 * macOS: `say <word>`
 * Windows: System.Speech.Synthesis via PowerShell
 * Linux: `espeak` or `spd-say`
 */
export function speakWord(word: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    const sanitizedWord = word.trim().replace(/["\n\r]/g, '');

    if (!sanitizedWord) {
      resolve();
      return;
    }

    if (platform === 'darwin') {
      const proc = spawn('say', [sanitizedWord]);
      proc.on('close', (code: number | null) => {
        if (code === 0) resolve();
        else reject(new Error(`say command exited with code ${code}`));
      });
      proc.on('error', reject);
    } else if (platform === 'win32') {
      const proc = spawn(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak([Console]::In.ReadLine())',
        ],
        { stdio: ['pipe', 'ignore', 'ignore'] }
      );

      proc.stdin?.write(`${sanitizedWord}\n`);
      proc.stdin?.end();

      proc.on('close', (code: number | null) => {
        if (code === 0) resolve();
        else reject(new Error(`PowerShell speech exited with code ${code}`));
      });
      proc.on('error', reject);
    } else {
      // Linux fallback
      const proc = spawn('espeak', [sanitizedWord]);
      proc.on('close', () => resolve());
      proc.on('error', () => {
        // Try spd-say
        const spd = spawn('spd-say', [sanitizedWord]);
        spd.on('close', () => resolve());
        spd.on('error', () => resolve());
      });
    }
  });
}
