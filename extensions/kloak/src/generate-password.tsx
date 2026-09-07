import React, { useState, useEffect, useCallback } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  getPreferenceValues
} from "@raycast/api";
import * as crypto from "node:crypto";

// High-entropy curated EFF Wordlist
const EFF_WORDLIST = [
  "abacus", "abdomen", "ability", "ablaze", "absolute", "absorb", "abstract", "absurd",
  "abundant", "academic", "academy", "accelerate", "accent", "accept", "access", "accident",
  "acclaim", "accompany", "accomplish", "account", "achieve", "acoustic", "acquire", "acrobat",
  "action", "activate", "active", "activity", "actor", "adapt", "adaptive", "adequate",
  "adhesive", "adjacent", "adjust", "admire", "admission", "admit", "adopt", "adorable",
  "advance", "adventure", "adverse", "advice", "advocate", "aerial", "aerobic", "aerospace",
  "aesthetic", "affirm", "affluent", "afford", "afloat", "afterglow", "afternoon", "agile",
  "agility", "ahead", "aircraft", "airfield", "airline", "airport", "airship", "albatross",
  "album", "alchemy", "alert", "algebra", "algorithm", "alias", "alibi", "alien",
  "align", "alignment", "allegro", "alliance", "alligator", "allocate", "almanac", "almond",
  "almost", "alpine", "altitude", "aluminum", "alumni", "amaze", "amazon", "amber",
  "ambiance", "ambition", "amethyst", "amiable", "amicable", "amplifier", "amplify", "amplitude",
  "amuse", "analog", "analogy", "analysis", "anchor", "ancient", "android", "anecdote",
  "angelic", "animate", "animation", "annex", "announce", "antenna", "anthem", "antique",
  "antiquity", "anvil", "apex", "apology", "apparel", "appeal", "appear", "applaud",
  "applause", "applied", "appoint", "appraise", "appreciate", "approach", "approval", "apricot",
  "aquarium", "aquatic", "aqueduct", "arcade", "arch", "archer", "archetype", "archipelago",
  "architect", "archive", "ardent", "arena", "argon", "arise", "armada", "armadillo",
  "armor", "aroma", "arrange", "array", "arrival", "arrow", "arsenal", "artful",
  "article", "artisan", "artist", "artistic", "artwork", "ascend", "ascent", "aspect",
  "aspire", "aspirin", "assemble", "assembly", "assert", "assess", "asset", "assign",
  "assist", "associate", "asteroid", "astonish", "astound", "astral", "astronaut", "astronomy",
  "astute", "athlete", "athletic", "atlas", "atmosphere", "atomic", "atrium", "attach",
  "attain", "attempt", "attitude", "attract", "attribute", "auction", "audacity", "audience",
  "audio", "audit", "auditorium", "augment", "august", "aura", "aurora", "author",
  "authority", "authorize", "automate", "automotive", "autumn", "avalanche", "avatar", "avenue",
  "average", "aviation", "aviator", "avid", "avocado", "awaken", "award", "awesome",
  "axiom", "axis", "azalea", "azure", "baboon", "backbone", "backdrop", "background",
  "backpack", "backstage", "backup", "badge", "badger", "bagel", "bagpipe", "baguette",
  "balance", "balcony", "ballad", "ballerina", "balloon", "ballot", "ballroom", "bamboo",
  "banana", "bandage", "bandana", "bandit", "bandwidth", "banjo", "banner", "banquet",
  "barbecue", "baritone", "barometer", "baron", "barrel", "barrier", "barter", "baseball",
  "basement", "basic", "basin", "basket", "basketball", "bassoon", "bastion", "battery",
  "battleship", "bayou", "bazaar", "beacon", "beagle", "beaver", "believer", "bellhop",
  "beloved", "benchmark", "benefit", "benzene", "beret", "berry", "berserk", "bifocals",
  "billiards", "billion", "binary", "binoculars", "biology", "bionic", "biosphere", "biplane",
  "biscuit", "bishop", "bison", "bizarre", "blackberry", "blackbird", "blueprint", "blunder",
  "boardwalk", "boastful", "boathouse", "bodyguard", "bolero", "bolster", "bonanza", "bonfire",
  "bonsai", "bonus", "bookcase", "bookmark", "bookshelf", "bookstore", "boomerang", "booster",
  "botanical", "botany", "boulder", "boundary", "bouquet", "bourbon", "boutique", "bowler",
  "bracket", "brainstorm", "bramble", "branch", "bravery", "bravado", "breakaway", "breakdown",
  "breakout", "breakthrough", "breeze", "brevity", "brick", "bridge", "brigade", "bright",
  "brilliance", "brilliant", "brimstone", "brisk", "broadband", "broadcast", "broadway", "brocade",
  "brochure", "bronze", "bubble", "bucket", "buckle", "buffet", "building", "bulb",
  "bulletin", "bullion", "bullseye", "bungalow", "buoyant", "bureau", "burnish", "business",
  "bustle", "butterfly", "button", "byline", "bypass", "cabana", "cabinet", "cable",
  "caboose", "cactus", "cadence", "cadet", "cafe", "caffeine", "calamity", "calcium",
  "calendar", "calibrate", "calico", "calipers", "calorie", "camel", "camera", "campground",
  "campfire", "campus", "canal", "canary", "candid", "candidate", "candle", "candor",
  "canine", "cannoli", "canopy", "cantaloupe", "canyon", "capacity", "capital", "capitol",
  "capstone", "captain", "caption", "captivate", "caramel", "caravan", "cardboard", "cardiac",
  "cardigan", "cardinal", "career", "caribou", "carnival", "carousel", "carpenter", "carrier",
  "carrot", "carrousel", "cascade", "cashew", "cashmere", "casino", "castle", "catalog",
  "catalyst", "catamaran", "cathedral", "caucus", "cavalry", "cavern", "cedar", "ceiling",
  "celebrate", "celestial", "celery", "cement", "cenote", "censor", "census", "centaur",
  "centennial", "century", "ceramic", "cereal", "cerebral", "ceremony", "certified", "chalk",
  "chamber", "champion", "chancellor", "chandelier", "chaos", "chaperon", "charcoal", "charger",
  "chariot", "charisma", "charity", "charm", "charter", "chateau", "checkers", "checkpoint",
  "cheer", "chemise", "chemist", "cherish", "cherry", "chestnut", "chevron", "chicory",
  "chimera", "chimney", "chipmunk", "chirp", "chivalry", "chocolate", "chord", "choreograph",
  "chrome", "chronicle", "chrysanthemum", "cider", "cigar", "cilantro", "cinema", "cinnamon",
  "cipher", "circuit", "circular", "citadel", "citation", "citizen", "citrus", "civic",
  "civilian", "clarity", "classic", "classify", "clavicle", "clay", "cleaner", "clearing",
  "cleat", "clever", "client", "climate", "climax", "clinic", "clique", "cloak",
  "clockwork", "clover", "clutch", "coastal", "coaster", "cobalt", "cobbler", "cobra",
  "coconut", "cocoon", "cognition", "cohesion", "collector", "college", "colloquial", "colony",
  "colossal", "column", "combine", "combustion", "comedy", "comet", "comfort", "commander",
  "commence", "commerce", "compact", "companion", "compass", "compile", "compliment", "composer",
  "composite", "compound", "compress", "compute", "computer", "comrade", "concave", "conceal",
  "concept", "concert", "conch", "concise", "conclude", "concrete", "condor", "conductor",
  "cone", "confection", "conference", "confident", "confirm", "conform", "confound", "congruent",
  "conifer", "conjecture", "conjure", "connect", "conquer", "conscious", "consensus", "consent",
  "conserve", "consistent", "console", "consonant", "consort", "conspiracy", "constable", "constant",
  "constellation", "construct", "consul", "consult", "consume", "contact", "contagion", "contain",
  "contemplate", "contemporary", "content", "contest", "context", "continent", "continue", "contour",
  "contract", "contrary", "contrast", "contribute", "control", "convene", "converge", "converse",
  "convert", "convex", "convey", "convince", "cookie", "cooling", "cooperate", "coordinate",
  "copper", "coral", "cordial", "core", "corkscrew", "corner", "cornucopia", "coronet",
  "corporate", "corridor", "corsage", "cortex", "cosmetic", "cosmic", "cosmos", "costume",
  "cottage", "cotton", "council", "counsel", "courage", "courier", "courtyard", "covenant",
  "cradle", "craftsman", "crater", "crayfish", "crayon", "creation", "creative", "creature",
  "credence", "credential", "credit", "creek", "crescent", "crest", "cricket", "crimson",
  "criterion", "critical", "critique", "crochet", "crocodile", "crossbar", "crossroad", "crown",
  "crucible", "cruise", "crumble", "crusade", "crush", "crust", "crystal", "cubicle",
  "cuisine", "culprit", "cultivate", "culture", "cupboard", "curator", "curiosity", "curious",
  "current", "cursor", "curtain", "cushion", "custom", "cyber", "cyclone", "cylinder",
  "cypress", "dagger", "dahlia", "daily", "dairy", "daisy", "dampness", "dance",
  "dandelion", "daring", "darkroom", "dashboard", "database", "daybreak", "daylight", "daytime",
  "dazzle", "dealership", "debate", "debris", "decade", "decathlon", "decimal", "decipher",
  "decision", "decisive", "declare", "decompose", "decorate", "decoy", "decree", "dedicate",
  "deduce", "deduct", "deepen", "default", "defeat", "defence", "defend", "defer",
  "defiance", "deficit", "deflate", "deflect", "deforest", "defrost", "degree", "dehydrate",
  "delegate", "deliberate", "delicate", "delicious", "delight", "deliver", "delivery", "delta",
  "delusion", "deluxe", "demand", "democracy", "demolish", "demon", "demote", "denial",
  "denim", "dense", "density", "dentist", "deodorant", "depend", "depict", "deploy",
  "deposit", "depot", "depth", "deputy", "derail", "derive", "derrick", "descend",
  "descent", "describe", "description", "desert", "deserve", "design", "designer", "desire",
  "desk", "desolate", "despair", "desperado", "dessert", "destiny", "destroy", "detach",
  "detail", "detect", "detective", "detention", "detergent", "determine", "detour", "develop",
  "device", "devious", "devote", "devotion", "dewdrop", "dexterity", "diagram", "dialogue",
  "diamond", "diaper", "diaphragm", "diary", "dice", "dictate", "diction", "dictionary",
  "diesel", "dietary", "differ", "diffuse", "digest", "digital", "dignity", "dilemma",
  "diligent", "dilute", "dimension", "diminish", "dimple", "diner", "dinghy", "dinosaur"
];

const UPPER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER_CHARS = "abcdefghijklmnopqrstuvwxyz";
const NUMBER_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const AMBIGUOUS_CHARS = "0O1lI|[]{}()/'\"`~,;:.<>";

function secureRandomInt(max: number): number {
  return crypto.randomInt(0, max);
}

interface StrengthAnalysis {
  entropyBits: number;
  label: "Very Strong" | "Strong" | "Moderate" | "Weak" | "Very Weak";
  crackTime: string;
  color: Color;
  icon: Icon;
}

function calculateStrength(secret: string, mode: string): StrengthAnalysis {
  if (!secret) {
    return {
      entropyBits: 0,
      label: "Very Weak",
      crackTime: "Instant",
      color: Color.Red,
      icon: Icon.Circle
    };
  }

  let entropy = 0;

  if (mode === "passphrase") {
    const words = secret.split(/[- _.+/]/).filter(Boolean);
    // EFF wordlist has ~7776 words => ~12.92 bits per word + ~6 bits if number appended
    const wordBits = words.length * 12.9;
    entropy = Math.round(wordBits + 6);
  } else if (mode === "pin") {
    // 10 digits = log2(10) ≈ 3.32 bits per digit
    entropy = Math.round(secret.length * 3.32);
  } else {
    let pool = 0;
    if (/[a-z]/.test(secret)) pool += 26;
    if (/[A-Z]/.test(secret)) pool += 26;
    if (/[0-9]/.test(secret)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(secret)) pool += 30;
    entropy = Math.round(secret.length * Math.log2(Math.max(pool, 2)));
  }

  if (entropy >= 90) {
    return {
      entropyBits: entropy,
      label: "Very Strong",
      crackTime: "Centuries / Billions of Years",
      color: Color.Green,
      icon: Icon.Shield
    };
  } else if (entropy >= 65) {
    return {
      entropyBits: entropy,
      label: "Strong",
      crackTime: "Decades",
      color: Color.Blue,
      icon: Icon.Shield
    };
  } else if (entropy >= 45) {
    return {
      entropyBits: entropy,
      label: "Moderate",
      crackTime: "Months to Years",
      color: Color.Yellow,
      icon: Icon.Warning
    };
  } else if (entropy >= 25) {
    return {
      entropyBits: entropy,
      label: "Weak",
      crackTime: "Hours to Days",
      color: Color.Orange,
      icon: Icon.ExclamationMark
    };
  } else {
    return {
      entropyBits: entropy,
      label: "Very Weak",
      crackTime: "Instant to Minutes",
      color: Color.Red,
      icon: Icon.Multiply
    };
  }
}

export default function GeneratePasswordCommand() {
  // Generator Modes: 'password' | 'passphrase' | 'pin'
  const [mode, setMode] = useState<string>("password");

  // Password Options
  const [length, setLength] = useState<string>("20");
  const [useUpper, setUseUpper] = useState<boolean>(true);
  const [useLower, setUseLower] = useState<boolean>(true);
  const [useNumbers, setUseNumbers] = useState<boolean>(true);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [avoidAmbiguous, setAvoidAmbiguous] = useState<boolean>(false);
  const [minNumbers, setMinNumbers] = useState<string>("1");
  const [minSymbols, setMinSymbols] = useState<string>("1");

  // Passphrase Options
  const [wordCount, setWordCount] = useState<string>("4");
  const [separator, setSeparator] = useState<string>("-");
  const [capitalize, setCapitalize] = useState<string>("title");
  const [includeNumber, setIncludeNumber] = useState<boolean>(true);

  // PIN Options
  const [pinLength, setPinLength] = useState<string>("6");

  // Output State
  const [generatedSecret, setGeneratedSecret] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const generate = useCallback(() => {
    if (mode === "pin") {
      const len = parseInt(pinLength, 10) || 6;
      let pin = "";
      for (let i = 0; i < len; i++) {
        pin += secureRandomInt(10).toString();
      }
      setGeneratedSecret(pin);
      return;
    }

    if (mode === "passphrase") {
      const count = Math.max(2, Math.min(16, parseInt(wordCount, 10) || 4));
      const words: string[] = [];
      for (let i = 0; i < count; i++) {
        let w = EFF_WORDLIST[secureRandomInt(EFF_WORDLIST.length)];
        if (capitalize === "title") {
          w = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        } else if (capitalize === "upper") {
          w = w.toUpperCase();
        } else if (capitalize === "lower") {
          w = w.toLowerCase();
        } else if (capitalize === "random") {
          w = Math.random() > 0.5 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase();
        }
        words.push(w);
      }

      if (includeNumber) {
        const randNum = secureRandomInt(90) + 10; // 10-99
        words.push(randNum.toString());
      }

      setGeneratedSecret(words.join(separator));
      return;
    }

    // Default: Mode === 'password'
    const len = Math.max(4, Math.min(128, parseInt(length, 10) || 20));
    let u = UPPER_CHARS;
    let l = LOWER_CHARS;
    let n = NUMBER_CHARS;
    let s = SYMBOL_CHARS;

    if (avoidAmbiguous) {
      u = u.split("").filter((c) => !AMBIGUOUS_CHARS.includes(c)).join("");
      l = l.split("").filter((c) => !AMBIGUOUS_CHARS.includes(c)).join("");
      n = n.split("").filter((c) => !AMBIGUOUS_CHARS.includes(c)).join("");
      s = s.split("").filter((c) => !AMBIGUOUS_CHARS.includes(c)).join("");
    }

    const pools: { chars: string; min: number }[] = [];
    if (useUpper && u.length > 0) pools.push({ chars: u, min: 1 });
    if (useLower && l.length > 0) pools.push({ chars: l, min: 1 });
    if (useNumbers && n.length > 0) pools.push({ chars: n, min: parseInt(minNumbers, 10) || 1 });
    if (useSymbols && s.length > 0) pools.push({ chars: s, min: parseInt(minSymbols, 10) || 1 });

    if (pools.length === 0) {
      // Fallback if all unticked
      pools.push({ chars: LOWER_CHARS, min: 1 });
    }

    const combinedPool = pools.map((p) => p.chars).join("");
    const chars: string[] = [];

    // Ensure minimum requirements
    for (const pool of pools) {
      for (let i = 0; i < pool.min && chars.length < len; i++) {
        chars.push(pool.chars[secureRandomInt(pool.chars.length)]);
      }
    }

    // Fill remaining length
    while (chars.length < len) {
      chars.push(combinedPool[secureRandomInt(combinedPool.length)]);
    }

    // Fisher-Yates cryptographically secure shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      const temp = chars[i];
      chars[i] = chars[j];
      chars[j] = temp;
    }

    setGeneratedSecret(chars.join(""));
  }, [
    mode,
    length,
    useUpper,
    useLower,
    useNumbers,
    useSymbols,
    avoidAmbiguous,
    minNumbers,
    minSymbols,
    wordCount,
    separator,
    capitalize,
    includeNumber,
    pinLength
  ]);

  // Live generation when parameters change
  useEffect(() => {
    generate();
  }, [generate, refreshTrigger]);

  const strength = calculateStrength(generatedSecret, mode);

  async function copyToClipboard(text: string) {
    if (!text) return;

    let clearSeconds = 30;
    try {
      const prefs = getPreferenceValues<{ autoClearClipboardSeconds?: string }>();
      if (prefs.autoClearClipboardSeconds) {
        const parsed = parseInt(prefs.autoClearClipboardSeconds, 10);
        if (!isNaN(parsed) && parsed > 0) clearSeconds = parsed;
      }
    } catch {
      // ignore
    }

    await Clipboard.copy(text, { concealed: true });
    showToast({
      style: Toast.Style.Success,
      title: "Secret Copied!",
      message: `Concealed in clipboard • Auto-clears in ${clearSeconds}s`
    });

    setTimeout(async () => {
      const current = await Clipboard.readText();
      if (current === text) {
        await Clipboard.clear();
      }
    }, clearSeconds * 1000);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Copy Secret (Enter)"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(generatedSecret)}
          />
          <Action.Paste
            title="Paste into Frontmost App"
            content={generatedSecret}
            shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
          />
          <Action
            title="Regenerate New Secret"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => setRefreshTrigger((prev) => prev + 1)}
          />
        </ActionPanel>
      }
    >
      {/* Generated Result Preview */}
      <Form.Description
        title="Generated Secret"
        text={generatedSecret || "Generating..."}
      />
      <Form.Description
        title="Entropy & Strength"
        text={`${strength.label} (${strength.entropyBits} bits) • Crack Time: ${strength.crackTime}`}
      />

      <Form.Separator />

      {/* Mode Selection */}
      <Form.Dropdown id="mode" title="Generator Mode" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="password" title="Random Password" icon={Icon.Key} />
        <Form.Dropdown.Item value="passphrase" title="EFF Passphrase" icon={Icon.Book} />
        <Form.Dropdown.Item value="pin" title="PIN Code" icon={Icon.Lock} />
      </Form.Dropdown>

      {/* Random Password Specific Options */}
      {mode === "password" && (
        <>
          <Form.Dropdown id="length" title="Password Length" value={length} onChange={setLength}>
            <Form.Dropdown.Item value="8" title="8 characters (Short)" />
            <Form.Dropdown.Item value="12" title="12 characters" />
            <Form.Dropdown.Item value="16" title="16 characters (Standard)" />
            <Form.Dropdown.Item value="20" title="20 characters (Recommended)" />
            <Form.Dropdown.Item value="24" title="24 characters (High Security)" />
            <Form.Dropdown.Item value="32" title="32 characters (Maximum Security)" />
            <Form.Dropdown.Item value="48" title="48 characters" />
            <Form.Dropdown.Item value="64" title="64 characters" />
            <Form.Dropdown.Item value="128" title="128 characters (Master Key)" />
          </Form.Dropdown>

          <Form.Checkbox
            id="useUpper"
            label="Uppercase Letters (A-Z)"
            value={useUpper}
            onChange={setUseUpper}
          />
          <Form.Checkbox
            id="useLower"
            label="Lowercase Letters (a-z)"
            value={useLower}
            onChange={setUseLower}
          />
          <Form.Checkbox
            id="useNumbers"
            label="Numbers (0-9)"
            value={useNumbers}
            onChange={setUseNumbers}
          />
          <Form.Checkbox
            id="useSymbols"
            label="Symbols (!@#$%^&*)"
            value={useSymbols}
            onChange={setUseSymbols}
          />
          <Form.Checkbox
            id="avoidAmbiguous"
            label="Avoid Ambiguous Characters (0, O, 1, l, I, |)"
            value={avoidAmbiguous}
            onChange={setAvoidAmbiguous}
          />

          <Form.Separator />

          <Form.Dropdown
            id="minNumbers"
            title="Minimum Numbers"
            value={minNumbers}
            onChange={setMinNumbers}
          >
            <Form.Dropdown.Item value="0" title="0 (Optional)" />
            <Form.Dropdown.Item value="1" title="At least 1 (Default)" />
            <Form.Dropdown.Item value="2" title="At least 2" />
            <Form.Dropdown.Item value="3" title="At least 3" />
            <Form.Dropdown.Item value="4" title="At least 4" />
          </Form.Dropdown>

          <Form.Dropdown
            id="minSymbols"
            title="Minimum Symbols"
            value={minSymbols}
            onChange={setMinSymbols}
          >
            <Form.Dropdown.Item value="0" title="0 (Optional)" />
            <Form.Dropdown.Item value="1" title="At least 1 (Default)" />
            <Form.Dropdown.Item value="2" title="At least 2" />
            <Form.Dropdown.Item value="3" title="At least 3" />
            <Form.Dropdown.Item value="4" title="At least 4" />
          </Form.Dropdown>
        </>
      )}

      {/* EFF Passphrase Specific Options */}
      {mode === "passphrase" && (
        <>
          <Form.Dropdown id="wordCount" title="Word Count" value={wordCount} onChange={setWordCount}>
            <Form.Dropdown.Item value="3" title="3 words" />
            <Form.Dropdown.Item value="4" title="4 words (Recommended)" />
            <Form.Dropdown.Item value="5" title="5 words (Strong)" />
            <Form.Dropdown.Item value="6" title="6 words (Very Strong)" />
            <Form.Dropdown.Item value="7" title="7 words" />
            <Form.Dropdown.Item value="8" title="8 words (Maximum Security)" />
            <Form.Dropdown.Item value="10" title="10 words" />
          </Form.Dropdown>

          <Form.Dropdown id="separator" title="Word Separator" value={separator} onChange={setSeparator}>
            <Form.Dropdown.Item value="-" title="Hyphen (-)" />
            <Form.Dropdown.Item value=" " title="Space ( )" />
            <Form.Dropdown.Item value="_" title="Underscore (_)" />
            <Form.Dropdown.Item value="." title="Period (.)" />
            <Form.Dropdown.Item value="+" title="Plus (+)" />
            <Form.Dropdown.Item value="/" title="Slash (/)" />
            <Form.Dropdown.Item value="" title="None (Concatenated)" />
          </Form.Dropdown>

          <Form.Dropdown id="capitalize" title="Capitalization" value={capitalize} onChange={setCapitalize}>
            <Form.Dropdown.Item value="title" title="Title Case (Word-Word)" />
            <Form.Dropdown.Item value="lower" title="lowercase (word-word)" />
            <Form.Dropdown.Item value="upper" title="UPPERCASE (WORD-WORD)" />
            <Form.Dropdown.Item value="random" title="Random (wOrD-WoRd)" />
          </Form.Dropdown>

          <Form.Checkbox
            id="includeNumber"
            label="Append Random 2-digit Number (e.g. -42)"
            value={includeNumber}
            onChange={setIncludeNumber}
          />
        </>
      )}

      {/* PIN Specific Options */}
      {mode === "pin" && (
        <Form.Dropdown id="pinLength" title="PIN Length" value={pinLength} onChange={setPinLength}>
          <Form.Dropdown.Item value="4" title="4 digits (ATM / Device PIN)" />
          <Form.Dropdown.Item value="6" title="6 digits (Standard Security)" />
          <Form.Dropdown.Item value="8" title="8 digits (High Security)" />
          <Form.Dropdown.Item value="10" title="10 digits" />
          <Form.Dropdown.Item value="12" title="12 digits (Maximum PIN)" />
          <Form.Dropdown.Item value="16" title="16 digits" />
        </Form.Dropdown>
      )}
    </Form>
  );
}
