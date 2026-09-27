import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  getEnrolledCourses,
  getCourseContents,
  getMoodlePrefs,
  downloadCourseFile,
} from "./api/moodle";
import { MoodleCourse, MoodleModule, MoodleContent } from "./api/types";
import { formatBytes, formatDateTime, stripHtml } from "./utils/formatters";

export default function BrowseCoursesCommand() {
  const { moodleUrl } = getMoodlePrefs();
  const {
    data: courses,
    isLoading,
    error,
    revalidate,
  } = usePromise(getEnrolledCourses, [], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load courses",
        message: err.message,
      });
    },
  });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your enrolled courses..."
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not connect to Moodle"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Retry"
                icon={Icon.RotateAntiClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        courses?.map((course) => {
          const courseUrl = `${moodleUrl}/course/view.php?id=${course.id}`;
          const progressText =
            course.progress !== null && course.progress !== undefined
              ? `${Math.round(course.progress)}% complete`
              : undefined;

          return (
            <List.Item
              key={course.id}
              icon={{ source: Icon.Book, tintColor: Color.Orange }}
              title={course.fullname}
              subtitle={course.shortname}
              accessories={[
                ...(progressText
                  ? [{ text: progressText, icon: Icon.CheckCircle }]
                  : []),
                { text: `ID: ${course.id}` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Course Materials & Files"
                    icon={Icon.Folder}
                    target={<CourseDetail course={course} />}
                  />
                  <Action.OpenInBrowser
                    title="Open Course in Browser"
                    url={courseUrl}
                  />
                  <Action.CopyToClipboard
                    title="Copy Course Link"
                    content={courseUrl}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function CourseDetail({ course }: { course: MoodleCourse }) {
  const { moodleUrl } = getMoodlePrefs();
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const {
    data: sections,
    isLoading,
    error,
    revalidate,
  } = usePromise(getCourseContents, [course.id], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load course materials",
        message: err.message,
      });
    },
  });

  const filteredSections = sections?.filter((sec) => {
    if (selectedSection === "all") return true;
    return String(sec.id) === selectedSection;
  });

  const getModuleIcon = (module: MoodleModule, content?: MoodleContent) => {
    if (content?.filename) {
      const ext = content.filename.split(".").pop()?.toLowerCase();
      if (["pdf"].includes(ext || ""))
        return { source: Icon.Document, tintColor: Color.Red };
      if (["doc", "docx", "pages"].includes(ext || ""))
        return { source: Icon.Document, tintColor: Color.Blue };
      if (["ppt", "pptx", "key"].includes(ext || ""))
        return { source: Icon.Document, tintColor: Color.Orange };
      if (["zip", "tar", "gz", "rar", "7z"].includes(ext || ""))
        return { source: Icon.HardDrive, tintColor: Color.Yellow };
      if (["mp4", "mov", "avi"].includes(ext || ""))
        return { source: Icon.Video, tintColor: Color.Purple };
      if (["mp3", "wav", "m4a"].includes(ext || ""))
        return { source: Icon.Music, tintColor: Color.Magenta };
    }

    switch (module.modname) {
      case "resource":
        return { source: Icon.Document, tintColor: Color.Blue };
      case "folder":
        return { source: Icon.Folder, tintColor: Color.Yellow };
      case "assign":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "url":
        return { source: Icon.Link, tintColor: Color.Purple };
      case "forum":
        return { source: Icon.SpeechBubble, tintColor: Color.Orange };
      case "quiz":
        return { source: Icon.QuestionMark, tintColor: Color.Magenta };
      case "page":
        return { source: Icon.BlankDocument, tintColor: Color.SecondaryText };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search materials in ${course.shortname}...`}
      searchBarAccessory={
        sections && sections.length > 1 ? (
          <List.Dropdown
            tooltip="Filter by Section"
            value={selectedSection}
            onChange={setSelectedSection}
          >
            <List.Dropdown.Item title="All Sections" value="all" />
            {sections.map((sec) => (
              <List.Dropdown.Item
                key={sec.id}
                title={sec.name || `Section ${sec.section}`}
                value={String(sec.id)}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not load course contents"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateAntiClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredSections?.map((section) => (
          <List.Section
            key={section.id}
            title={section.name || `Section ${section.section}`}
            subtitle={stripHtml(section.summary).slice(0, 60)}
          >
            {section.modules
              ?.filter((mod) => mod.uservisible !== false)
              .flatMap((mod) => {
                const moduleUrl =
                  mod.url ||
                  `${moodleUrl}/mod/${mod.modname}/view.php?id=${mod.id}`;

                // If module has individual downloadable files (resource or folder contents)
                if (mod.contents && mod.contents.length > 0) {
                  return mod.contents.map((file, idx) => (
                    <List.Item
                      key={`${mod.id}-${idx}-${file.filename}`}
                      icon={getModuleIcon(mod, file)}
                      title={file.filename || mod.name}
                      subtitle={mod.contents!.length > 1 ? mod.name : undefined}
                      accessories={[
                        { text: formatBytes(file.filesize) },
                        { text: formatDateTime(file.timemodified) },
                      ]}
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section title="File Actions">
                            <Action
                              title="Download File"
                              icon={Icon.Download}
                              onAction={async () => {
                                await downloadCourseFile(
                                  file.fileurl,
                                  file.filename,
                                  course.shortname,
                                );
                              }}
                            />
                            <Action.OpenInBrowser
                              title="Open Resource in Browser"
                              url={moduleUrl}
                            />
                            <Action.CopyToClipboard
                              title="Copy Download URL"
                              content={file.fileurl}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Course Links">
                            <Action.OpenInBrowser
                              title="Open Course Page"
                              url={`${moodleUrl}/course/view.php?id=${course.id}`}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  ));
                }

                // Generic module entry (e.g. assignment link, forum, quiz)
                return [
                  <List.Item
                    key={mod.id}
                    icon={getModuleIcon(mod)}
                    title={mod.name}
                    subtitle={mod.modname.toUpperCase()}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser
                          title={`Open ${mod.name} in Browser`}
                          url={moduleUrl}
                        />
                        <Action.CopyToClipboard
                          title="Copy Link"
                          content={moduleUrl}
                        />
                      </ActionPanel>
                    }
                  />,
                ];
              })}
          </List.Section>
        ))
      )}
    </List>
  );
}
