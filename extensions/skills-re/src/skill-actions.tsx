import { Action, ActionPanel, Icon, showInFinder, showToast, Toast } from "@raycast/api";
import { access, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { useEffect, useState } from "react";

import { checkSaved, getActiveCredential, resolveInstall, saveSkill, skillPath, skillUrl, unsaveSkill } from "./api";
import type { AuthCredential, SavedSkill, Skill } from "./api";
import { getErrorMessage } from "./api-error";
import { ApiTokenForm } from "./auth";
import { SkillReviewForm } from "./skill-review-form";

interface Props {
  detailTarget?: Action.Push.Props["target"];
  onChanged?: () => void;
  showReviewAction?: boolean;
  skill: Skill | SavedSkill;
}

const copyInstallCommand = (skill: Skill | SavedSkill) => `npx @skills-re/cli install ${skillPath(skill)}`;

const DOWNLOADS_DIRECTORY = join(homedir(), "Downloads");
const DEFAULT_ARCHIVE_FILE_NAME = "skill.zip";

const pathExists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const sanitizeFileName = (fileName: string) => {
  const safeName = Array.from(basename(fileName).replace(/[<>:"/\\|?*]/g, "-"), (character) =>
    (character.codePointAt(0) ?? 0) < 32 ? "-" : character,
  )
    .join("")
    .trim();
  return safeName && safeName !== "." ? safeName : DEFAULT_ARCHIVE_FILE_NAME;
};

const getDownloadPath = async (fileName: string) => {
  const safeName = sanitizeFileName(fileName);
  const extension = extname(safeName);
  const baseName = safeName.slice(0, safeName.length - extension.length) || "skill";
  let candidate = join(DOWNLOADS_DIRECTORY, safeName);

  for (let index = 1; await pathExists(candidate); index += 1) {
    candidate = join(DOWNLOADS_DIRECTORY, `${baseName} (${index})${extension}`);
  }

  return candidate;
};

const downloadFile = async (url: string, fileName: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}.`);
  }

  await mkdir(DOWNLOADS_DIRECTORY, { recursive: true });
  const filePath = await getDownloadPath(fileName);
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  return filePath;
};

const showFailure = async (title: string, error: unknown) => {
  await showToast({
    message: getErrorMessage(error),
    style: Toast.Style.Failure,
    title,
  });
};

export function SkillActions({ detailTarget, onChanged, showReviewAction, skill }: Props) {
  const [credential, setCredential] = useState<AuthCredential | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const activeCredential = await getActiveCredential();
        setCredential(activeCredential);
        if (!activeCredential) {
          return;
        }

        const result = await checkSaved(skill.slug, activeCredential.token);
        setSaved(result.saved);
      } catch {
        setCredential(null);
        setSaved(false);
      }
    };

    void loadSavedState();
  }, [skill.slug]);

  const toggleSaved = async () => {
    if (!credential) {
      return;
    }

    try {
      if (saved) {
        await unsaveSkill(skill.slug, credential.token);
        setSaved(false);
        await showToast({ style: Toast.Style.Success, title: "Removed from saved skills" });
      } else {
        await saveSkill(skill.slug, credential.token);
        setSaved(true);
        await showToast({ style: Toast.Style.Success, title: "Saved skill" });
      }
      onChanged?.();
    } catch (error) {
      await showFailure(saved ? "Could not remove skill" : "Could not save skill", error);
    }
  };

  const getArchiveDownload = async () => {
    const resolution = await resolveInstall(skillPath(skill));
    const downloadUrl = resolution.archive.downloadUrl;

    if (!resolution.archive.available || !downloadUrl) {
      throw new Error("No downloadable archive is available for this skill.");
    }

    return {
      fileName: resolution.archive.fileName,
      url: downloadUrl,
    };
  };

  const downloadArchive = async () => {
    let toast: Toast | undefined;

    try {
      const archive = await getArchiveDownload();
      toast = await showToast({
        message: archive.fileName,
        style: Toast.Style.Animated,
        title: "Downloading archive",
      });
      const filePath = await downloadFile(archive.url, archive.fileName);

      toast.style = Toast.Style.Success;
      toast.title = "Archive downloaded";
      toast.message = archive.fileName;
      toast.primaryAction = {
        title: "Show Download",
        onAction: () => {
          void showInFinder(filePath);
        },
      };
      try {
        await showInFinder(filePath);
      } catch {
        // The archive has already been saved; revealing it is a best-effort convenience.
      }
    } catch (error) {
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not download archive";
        toast.message = getErrorMessage(error);
      } else {
        await showFailure("Could not download archive", error);
      }
    }
  };

  return (
    <ActionPanel>
      {detailTarget ? <Action.Push icon={Icon.Sidebar} title="Show Details" target={detailTarget} /> : null}
      <Action icon={Icon.ArrowDownCircle} title="Download Archive" onAction={downloadArchive} />
      <Action.CopyToClipboard content={copyInstallCommand(skill)} icon={Icon.Terminal} title="Copy Install Command" />
      <Action.OpenInBrowser icon={Icon.Globe} title="Open on Skills.re" url={skillUrl(skill)} />
      {"repoUrl" in skill && skill.repoUrl ? (
        <Action.OpenInBrowser icon={Icon.Code} title="Open Repository" url={skill.repoUrl} />
      ) : null}
      {showReviewAction ? (
        <Action.Push
          icon={Icon.Pencil}
          title="Review Skill"
          target={credential ? <SkillReviewForm skill={skill} token={credential.token} /> : <ApiTokenForm />}
        />
      ) : null}
      {credential ? (
        <Action
          icon={saved ? Icon.StarDisabled : Icon.Star}
          title={saved ? "Remove from Saved Skills" : "Save Skill"}
          onAction={toggleSaved}
        />
      ) : (
        <Action.Push icon={Icon.Key} title="Configure API Token" target={<ApiTokenForm />} />
      )}
    </ActionPanel>
  );
}
