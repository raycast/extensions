import { Action, ActionPanel, Clipboard, closeMainWindow, Form, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import { randomBytes } from "crypto";
import { execAPWCommand, getActiveURL, PREFERENCES } from "./utils";

interface SaveFormValues {
  url: string;
  username: string;
  password: string;
}

type PasswordType = "random" | "alphanumeric" | "memorable" | "pin";

const CHARS_RANDOM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_";
const CHARS_ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const WORDS = [
  "amber",
  "ash",
  "bay",
  "bloom",
  "bluff",
  "blaze",
  "brook",
  "cave",
  "cliff",
  "cloud",
  "coast",
  "cove",
  "creek",
  "crest",
  "dawn",
  "dew",
  "drift",
  "dune",
  "dusk",
  "elm",
  "ember",
  "fern",
  "fjord",
  "flame",
  "flint",
  "fog",
  "ford",
  "frost",
  "gale",
  "glade",
  "glen",
  "glow",
  "grove",
  "gulf",
  "haze",
  "heath",
  "hill",
  "inlet",
  "isle",
  "jade",
  "lake",
  "lava",
  "leaf",
  "ledge",
  "loch",
  "marsh",
  "mead",
  "mesa",
  "mist",
  "moon",
  "moor",
  "moss",
  "mount",
  "oak",
  "opal",
  "peak",
  "pine",
  "pond",
  "pool",
  "rain",
  "reef",
  "ridge",
  "river",
  "rock",
  "rose",
  "sand",
  "shore",
  "slate",
  "snow",
  "spring",
  "star",
  "stem",
  "stone",
  "storm",
  "stream",
  "sun",
  "surf",
  "tide",
  "vale",
  "vine",
  "wave",
  "wind",
  "wood",
  "bear",
  "bull",
  "crane",
  "crow",
  "deer",
  "dove",
  "duck",
  "eagle",
  "elk",
  "falcon",
  "finch",
  "fox",
  "frog",
  "hawk",
  "heron",
  "jay",
  "kite",
  "lion",
  "lynx",
  "mink",
  "mole",
  "moth",
  "newt",
  "otter",
  "owl",
  "ram",
  "raven",
  "robin",
  "rook",
  "seal",
  "shark",
  "snipe",
  "sparrow",
  "stag",
  "swan",
  "swift",
  "teal",
  "thrush",
  "toad",
  "trout",
  "vole",
  "weasel",
  "wolf",
  "wren",
  "acorn",
  "anvil",
  "arrow",
  "axe",
  "badge",
  "bead",
  "bell",
  "blade",
  "bolt",
  "bone",
  "boot",
  "bow",
  "brand",
  "bridge",
  "cape",
  "chain",
  "charm",
  "chest",
  "cloak",
  "coin",
  "crest",
  "crown",
  "drum",
  "fable",
  "flute",
  "forge",
  "gate",
  "gem",
  "glove",
  "gold",
  "grail",
  "guild",
  "harp",
  "helm",
  "hilt",
  "horn",
  "iron",
  "key",
  "knot",
  "lance",
  "lute",
  "mace",
  "mask",
  "mast",
  "moat",
  "oar",
  "orb",
  "pike",
  "plume",
  "quill",
  "relic",
  "ring",
  "robe",
  "rope",
  "ruby",
  "rune",
  "sail",
  "salt",
  "shard",
  "shield",
  "silk",
  "silver",
  "spear",
  "staff",
  "steel",
  "sword",
  "thorn",
  "tome",
  "torch",
  "totem",
  "tower",
  "vault",
  "ward",
];

function generatePassword(type: PasswordType, length = 20): string {
  switch (type) {
    case "random": {
      const b = randomBytes(length);
      return Array.from(b, (x) => CHARS_RANDOM[x % CHARS_RANDOM.length]).join("");
    }
    case "alphanumeric": {
      const b = randomBytes(length);
      return Array.from(b, (x) => CHARS_ALNUM[x % CHARS_ALNUM.length]).join("");
    }
    case "memorable": {
      const b = randomBytes(4);
      return Array.from(b, (x) => WORDS[x % WORDS.length]).join("-");
    }
    case "pin": {
      const b = randomBytes(6);
      return Array.from(b, (x) => x % 10).join("");
    }
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasBrowserURL, setHasBrowserURL] = useState(false);
  const [passwordType, setPasswordType] = useState<PasswordType>("random");
  const [passwordLength, setPasswordLength] = useState(20);

  const { handleSubmit, itemProps, setValue } = useForm<SaveFormValues>({
    async onSubmit({ url, username, password }) {
      await closeMainWindow();
      if (hasBrowserURL) {
        await new Promise((r) => setTimeout(r, 150));
        if (PREFERENCES.copySecrets) {
          await Clipboard.copy(password);
        } else {
          await Clipboard.paste(password);
        }
      }
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Saving…",
      });
      try {
        const result = await execAPWCommand(["pw", "save", "--stdin", url, username], password);
        if (result.status === 0) {
          await toast.hide();
          await showHUD(
            hasBrowserURL ? `Password saved and ${PREFERENCES.copySecrets ? "copied" : "filled"}` : "Password saved",
          );
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed to save";
          toast.message = result.error || "Unknown error";
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to save";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    },
    validation: {
      url: FormValidation.Required,
      username: FormValidation.Required,
      password: FormValidation.Required,
    },
  });

  useEffect(() => {
    Promise.all([getActiveURL().catch(() => ""), Clipboard.readText().catch(() => null)])
      .then(([activeURL, clipText]) => {
        if (activeURL) {
          setValue("url", activeURL);
          setHasBrowserURL(true);
        }
        if (clipText?.trim()) setValue("password", clipText.trim());
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Password" onSubmit={handleSubmit} />
          <Action
            title="Generate Password"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={() => setValue("password", generatePassword(passwordType, passwordLength))}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="example.com" {...itemProps.url} />
      <Form.TextField title="Username" placeholder="you@example.com" {...itemProps.username} />
      <Form.Dropdown
        id="passwordType"
        title="Type"
        value={passwordType}
        onChange={(v) => setPasswordType(v as PasswordType)}
      >
        <Form.Dropdown.Item value="random" title="Random (letters, digits & symbols)" />
        <Form.Dropdown.Item value="alphanumeric" title="Alphanumeric (letters & digits)" />
        <Form.Dropdown.Item value="memorable" title="Memorable (4-word passphrase)" />
        <Form.Dropdown.Item value="pin" title="PIN (6 digits)" />
      </Form.Dropdown>
      {(passwordType === "random" || passwordType === "alphanumeric") && (
        <Form.TextField
          id="passwordLength"
          title="Length"
          value={String(passwordLength)}
          info="Characters to generate (4–128)"
          onChange={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n)) setPasswordLength(Math.min(128, Math.max(4, n)));
          }}
        />
      )}
      <Form.TextField
        title="Password"
        placeholder="Enter a password or press ⌘G to generate"
        info="⌘G generates a password using the selected type"
        {...itemProps.password}
      />
    </Form>
  );
}
