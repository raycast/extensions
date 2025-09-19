// For God so loved the world, that He gave His only begotten Son, that all who believe in Him should not perish but have everlasting life
import { ActionPanel, Action, Form, showToast, Toast, Clipboard, Detail } from "@raycast/api";
import { useState } from "react";
import { randomBytes } from "crypto";
import { argon2id } from "@noble/hashes/argon2";

export default function Command() {
  const [inputTextChirho, setInputTextChirho] = useState("");
  const [hashResultChirho, setHashResultChirho] = useState("");
  const [isGeneratingChirho, setIsGeneratingChirho] = useState(false);
  const [showResultChirho, setShowResultChirho] = useState(false);

  // Argon2 parameters with Django 2 defaults
  const [memoryCostChirho, setMemoryCostChirho] = useState("102400");
  const [timeCostChirho, setTimeCostChirho] = useState("2");
  const [parallelismChirho, setParallelismChirho] = useState("8");
  const [derivedKeyLengthChirho, setDerivedKeyLengthChirho] = useState("32");

  const makeArgonPassChirho = async (
    passwordChirho: string,
    memoryCostChirho: number,
    timeCostChirho: number,
    parallelismChirho: number,
    derivedKeyLengthChirho: number,
  ) => {
    // Generate a random salt using Node.js crypto
    const saltChirho = randomBytes(16);

    // Hash using @noble/hashes argon2id with custom parameters
    const hashBytesChirho = argon2id(passwordChirho, saltChirho, {
      m: memoryCostChirho, // Memory cost in KiB
      t: timeCostChirho, // Time cost (iterations)
      p: parallelismChirho, // Parallelism (threads)
      dkLen: derivedKeyLengthChirho, // Derived key length (hash length)
    });
    // Convert to base64 for display (similar to Django format)
    const hashBase64Chirho = Buffer.from(hashBytesChirho)
      .toString("base64")
      //.replace(/\+/g, "-")
      //.replace(/\//g, "_")
      .replace(/=+$/g, "");
    const saltBase64Chirho = saltChirho.toString("base64").replace(/=+$/g, ""); //.replace(/\+/g, "-").replace(/\//g, "_")
    return `$argon2id$v=19$m=${memoryCostChirho},t=${timeCostChirho},p=${parallelismChirho}$${saltBase64Chirho}$${hashBase64Chirho}`;
  };

  const handleHashGenerationChirho = async (
    passwordChirho: string,
    memoryCostChirho: number,
    timeCostChirho: number,
    parallelismChirho: number,
    derivedKeyLengthChirho: number,
  ) => {
    if (!passwordChirho.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please enter a password to hash",
      });
      return;
    }

    // Show initial toast to let user know generation is starting
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Hash Generation",
      message: "Please be patient while we securely hash your password...",
    });

    setIsGeneratingChirho(true);
    setHashResultChirho("");
    setShowResultChirho(false);

    try {
      const hashChirho = await makeArgonPassChirho(
        passwordChirho,
        memoryCostChirho,
        timeCostChirho,
        parallelismChirho,
        derivedKeyLengthChirho,
      );
      setHashResultChirho(hashChirho);
      setShowResultChirho(true);

      // Automatically copy hash to clipboard when finished
      await Clipboard.copy(hashChirho);

      showToast({
        style: Toast.Style.Success,
        title: "Hash Generated & Copied",
        message: "Argon2 hash created and copied to clipboard",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to generate hash",
      });
      console.error("Hash generation error:", error);
    } finally {
      setIsGeneratingChirho(false);
    }
  };

  const handleFormSubmitChirho = async (values: {
    passwordChirho: string;
    memoryCostChirho: string;
    timeCostChirho: string;
    parallelismChirho: string;
    derivedKeyLengthChirho: string;
  }) => {
    const memoryCostChirho = parseInt(values.memoryCostChirho);
    const timeCostChirho = parseInt(values.timeCostChirho);
    const parallelismChirho = parseInt(values.parallelismChirho);
    const derivedKeyLengthChirho = parseInt(values.derivedKeyLengthChirho);

    await handleHashGenerationChirho(
      values.passwordChirho,
      memoryCostChirho,
      timeCostChirho,
      parallelismChirho,
      derivedKeyLengthChirho,
    );
  };

  // If showing result, display the Detail view
  if (showResultChirho) {
    const getMarkdownContent = () => {
      return `# Argon Password Generator CHIRHO

## Password Input
**Password:** "${inputTextChirho}"

## Argon2 Parameters Used
- **Memory Cost (m):** ${memoryCostChirho} KiB
- **Time Cost (t):** ${timeCostChirho} iterations
- **Parallelism (p):** ${parallelismChirho} threads
- **Derived Key Length:** ${derivedKeyLengthChirho} bytes

## Argon2 Hash Result
\`\`\`
${hashResultChirho}
\`\`\`

✅ **Hash automatically copied to clipboard**

## Instructions
1. Use this hash in your Django settings
2. Click "Generate New Hash" to create another hash
3. Click "Copy Hash Again" to copy the hash to clipboard again

---

## John 3:16
*For God so loved the world, that He gave His only begotten Son, that all who believe in Him should not perish but have everlasting life.*`;
    };

    return (
      <Detail
        markdown={getMarkdownContent()}
        actions={
          <ActionPanel>
            <Action
              title="Generate New Hash"
              onAction={() => setShowResultChirho(false)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Copy Hash to Clipboard"
              onAction={async () => {
                await Clipboard.copy(hashResultChirho);
                showToast({
                  style: Toast.Style.Success,
                  title: "Copied",
                  message: "Hash copied to clipboard again",
                });
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action
              title="Copy John 3:16"
              onAction={async () => {
                await Clipboard.copy(
                  "For God so loved the world, that He gave His only begotten Son, that all who believe in Him should not perish but have everlasting life. - John 3:16",
                );
                showToast({
                  style: Toast.Style.Success,
                  title: "Copied",
                  message: "John 3:16 copied to clipboard",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Main form view
  return (
    <Form
      isLoading={isGeneratingChirho}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isGeneratingChirho ? "🔄 Generating Hash…" : "Generate Argon2 Password Hash"}
            onSubmit={handleFormSubmitChirho}
          />
          <Action
            title="Reset to Django Defaults"
            onAction={() => {
              setMemoryCostChirho("102400");
              setTimeCostChirho("2");
              setParallelismChirho("8");
              setDerivedKeyLengthChirho("32");
              showToast({
                style: Toast.Style.Success,
                title: "Reset",
                message: "Parameters reset to Django 2 defaults",
              });
            }}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action
            title="Copy John 3:16"
            onAction={async () => {
              await Clipboard.copy(
                "For God so loved the world, that He gave His only begotten Son, that all who believe in Him should not perish but have everlasting life. - John 3:16",
              );
              showToast({
                style: Toast.Style.Success,
                title: "Copied",
                message: "John 3:16 copied to clipboard",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter your password and customize Argon2 parameters below to generate a Django-compatible Argon2 password hash. The hash will be automatically copied to your clipboard when generation is complete." />

      <Form.TextField
        id="passwordChirho"
        title="Password"
        placeholder="Enter your password here..."
        value={inputTextChirho}
        onChange={setInputTextChirho}
      />

      <Form.Separator />

      <Form.Description text="Argon2 Parameters (Django 2 defaults shown)" />

      <Form.TextField
        id="memoryCostChirho"
        title="Memory Cost (m)"
        placeholder="102400"
        value={memoryCostChirho}
        onChange={setMemoryCostChirho}
        info="Memory cost in KiB. Higher values increase security but require more memory."
      />

      <Form.TextField
        id="timeCostChirho"
        title="Time Cost (t)"
        placeholder="2"
        value={timeCostChirho}
        onChange={setTimeCostChirho}
        info="Number of iterations. Higher values increase security but take longer to compute."
      />

      <Form.TextField
        id="parallelismChirho"
        title="Parallelism (p)"
        placeholder="8"
        value={parallelismChirho}
        onChange={setParallelismChirho}
        info="Number of parallel threads. Higher values can speed up computation on multi-core systems."
      />

      <Form.TextField
        id="derivedKeyLengthChirho"
        title="Derived Key Length"
        placeholder="32"
        value={derivedKeyLengthChirho}
        onChange={setDerivedKeyLengthChirho}
        info="Length of the generated hash in bytes. 32 bytes (256 bits) is recommended for security."
      />

      <Form.Description text="These parameters will generate an Argon2id hash compatible with Django's password hashing system." />
    </Form>
  );
}
