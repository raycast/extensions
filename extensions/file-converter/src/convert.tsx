import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  open,
  Detail,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import {
  buildCommand,
  buildOutputPath,
  getCategory,
  getTargetFormats,
} from "./utils";

export default function Command() {
  const [filePath, setFilePath] = useState<string[]>([]);
  const [targetFormat, setTargetFormat] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);
  const [resultPath, setResultPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => {
        if (items.length > 0) {
          setFilePath([items[0].path]);
        }
      })
      .catch(() => {
        // Finder n'est pas au premier plan, on laisse le picker vide
      });
  }, []);

  const selectedFile = filePath[0] ?? null;
  const ext = selectedFile
    ? path.extname(selectedFile).replace(".", "").toLowerCase()
    : "";
  const category = selectedFile ? getCategory(selectedFile) : "unknown";
  const formats = selectedFile ? getTargetFormats(category, ext) : [];

  async function handleConvert() {
    if (!selectedFile || !targetFormat) return;

    setIsConverting(true);
    setError(null);
    setResultPath(null);

    const outputPath = buildOutputPath(selectedFile, targetFormat);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Conversion en cours…",
      });

      const cmd = buildCommand(selectedFile, outputPath, category);
      execSync(cmd, { timeout: 120_000 });

      if (!fs.existsSync(outputPath)) {
        throw new Error("Le fichier de sortie n'a pas été créé.");
      }

      setResultPath(outputPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Conversion réussie",
        message: path.basename(outputPath),
        primaryAction: {
          title: "Ouvrir le fichier",
          onAction: () => open(outputPath),
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      await showToast({
        style: Toast.Style.Failure,
        title: "Erreur",
        message: msg,
      });
    } finally {
      setIsConverting(false);
    }
  }

  if (resultPath) {
    return (
      <Detail
        markdown={`## Conversion réussie ✅\n\n**Fichier :** \`${path.basename(resultPath)}\`\n\n**Dossier :** \`${path.dirname(resultPath)}\``}
        actions={
          <ActionPanel>
            <Action
              title="Ouvrir Le Fichier"
              onAction={() => open(resultPath)}
            />
            <Action
              title="Ouvrir Le Dossier"
              onAction={() => open(path.dirname(resultPath))}
            />
            <Action
              title="Nouvelle Conversion"
              onAction={() => setResultPath(null)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isConverting}
      actions={
        <ActionPanel>
          <Action
            title={isConverting ? "Conversion…" : "Convertir"}
            onAction={handleConvert}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Fichier source"
        allowMultipleSelection={false}
        value={filePath}
        onChange={(v) => {
          setFilePath(v);
          setTargetFormat("");
          setResultPath(null);
          setError(null);
        }}
      />

      {selectedFile && category === "unknown" && (
        <Form.Description
          title="Format non supporté"
          text="Ce type de fichier n'est pas pris en charge. Formats supportés : vidéo, audio, image, document."
        />
      )}

      {selectedFile && category !== "unknown" && (
        <>
          <Form.Description
            title="Type détecté"
            text={`${category.charAt(0).toUpperCase() + category.slice(1)} (.${ext})`}
          />
          <Form.Dropdown
            id="format"
            title="Convertir en"
            value={targetFormat}
            onChange={setTargetFormat}
          >
            <Form.Dropdown.Item value="" title="— Choisir un format —" />
            {formats.map((f) => (
              <Form.Dropdown.Item
                key={f}
                value={f}
                title={`.${f.toUpperCase()}`}
              />
            ))}
          </Form.Dropdown>
        </>
      )}

      {error && <Form.Description title="Erreur" text={error} />}
    </Form>
  );
}
