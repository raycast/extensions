import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Course } from "../lib/courses";
import { CourseFile, CourseModule, fetchCourseContents } from "../lib/contents";
import { formatBytes } from "../lib/format";
import { getLanguage } from "../lib/prefs";
import { AuthEmptyView, isAuthError, showError } from "./errors";
import { FileActions } from "./file-actions";
import { fileIcon, moduleIcon } from "./icons";

function CourseActions({ course }: { course: Course }) {
  return (
    <ActionPanel.Section title="Course">
      <Action.OpenInBrowser
        title="Open Course in Browser"
        url={course.viewUrl}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action.CopyToClipboard
        title="Copy Course Link"
        content={course.viewUrl}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
    </ActionPanel.Section>
  );
}

export function FileItem({ file, course, subtitle }: { file: CourseFile; course?: Course; subtitle?: string }) {
  return (
    <List.Item
      key={file.id}
      title={file.name}
      subtitle={subtitle}
      icon={fileIcon(file.name, file.mimetype)}
      keywords={[file.moduleName, file.sectionName]}
      accessories={[{ text: formatBytes(file.size) }, ...(file.modified ? [{ date: file.modified }] : [])]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <FileActions file={file} />
          </ActionPanel.Section>
          {course ? <CourseActions course={course} /> : null}
        </ActionPanel>
      }
    />
  );
}

function FolderView({ module, course }: { module: CourseModule; course: Course }) {
  return (
    <List navigationTitle={module.name} searchBarPlaceholder="Search files…">
      {module.files.length === 0 ? (
        <List.EmptyView icon={Icon.Folder} title="Empty folder" description="This folder has no files yet" />
      ) : (
        module.files.map((file) => <FileItem key={file.id} file={file} course={course} />)
      )}
    </List>
  );
}

function ModuleItem({ module, course }: { module: CourseModule; course: Course }) {
  const singleFile = module.modname === "resource" && module.files.length === 1 ? module.files[0] : undefined;
  const accessories: List.Item.Accessory[] = [];
  if (module.modname === "folder") accessories.push({ text: `${module.files.length} files` });
  if (singleFile) accessories.push({ text: formatBytes(singleFile.size) });
  if (singleFile?.modified) accessories.push({ date: singleFile.modified });
  if (module.externalUrl) accessories.push({ icon: Icon.Globe, tooltip: module.externalUrl });

  return (
    <List.Item
      title={module.name}
      subtitle={singleFile ? singleFile.name : module.description}
      icon={singleFile ? fileIcon(singleFile.name, singleFile.mimetype) : moduleIcon(module.modname)}
      keywords={[module.modname, ...module.files.map((file) => file.name)]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {module.modname === "folder" ? (
              <Action.Push
                title="Browse Folder"
                icon={Icon.Folder}
                target={<FolderView module={module} course={course} />}
              />
            ) : null}
            {singleFile ? <FileActions file={singleFile} /> : null}
            {module.externalUrl ? <Action.OpenInBrowser title="Open Link" url={module.externalUrl} /> : null}
            {module.url && !singleFile ? <Action.OpenInBrowser title="Open in Browser" url={module.url} /> : null}
            {module.url ? (
              <Action.CopyToClipboard
                title="Copy Link"
                content={module.externalUrl ?? module.url}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            ) : null}
          </ActionPanel.Section>
          <CourseActions course={course} />
        </ActionPanel>
      }
    />
  );
}

/** Sections and activities of a course, pushed from the course list. */
export function CourseContentsView({ course }: { course: Course }) {
  const lang = getLanguage();
  const { data, isLoading, error } = useCachedPromise(fetchCourseContents, [course.id, lang], {
    onError: showError,
  });

  return (
    <List isLoading={isLoading} navigationTitle={course.name} searchBarPlaceholder="Search sections and activities…">
      {error && isAuthError(error) ? (
        <AuthEmptyView error={error} />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No content yet"
          description="This course has no visible sections"
          actions={
            <ActionPanel>
              <CourseActions course={course} />
            </ActionPanel>
          }
        />
      ) : (
        data?.map((section) => (
          <List.Section key={section.id} title={section.name} subtitle={`${section.modules.length}`}>
            {section.modules.map((module) => (
              <ModuleItem key={module.id} module={module} course={course} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
