import {
  ActionPanel,
  Form,
  Icon,
  useNavigation,
  closeMainWindow,
  open,
  Toast,
  Action,
  Color,
  PopToRootType,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useRef } from "react";

import { addComment, addTask, uploadFile, Label } from "./api";
import RefreshAction from "./components/RefreshAction";
import TaskDetail from "./components/TaskDetail";
import { getCollaboratorIcon, getProjectCollaborators } from "./helpers/collaborators";
import { getColorByKey } from "./helpers/colors";
import { priorities } from "./helpers/priorities";
import { getPriorityIcon } from "./helpers/priorities";
import { getProjectIcon } from "./helpers/projects";
import { getTaskAppUrl, getTaskUrl } from "./helpers/tasks";
import { withTodoistApi } from "./helpers/withTodoistApi";
import { isTodoistInstalled } from "./hooks/useIsTodoistInstalled";
import { useNLPParser } from "./hooks/useNLPParser";
import useSyncData from "./hooks/useSyncData";

type CreateTaskValues = {
  content: string;
  description: string;
  date: Date | null;
  deadline: Date | null;
  duration: string;
  priority: string;
  projectId: string;
  sectionId: string;
  labels: string[];
  parentId: string;
  responsibleUid: string;
  files: string[];
};

type CreateTaskProps = {
  fromLabel?: string;
  fromProjectId?: string;
  fromTodayEmptyView?: boolean;
  draftValues?: CreateTaskValues;
};

function CreateTask({ fromProjectId, fromLabel, fromTodayEmptyView, draftValues }: CreateTaskProps) {
  const { shouldCloseMainWindow } = getPreferenceValues<Preferences.CreateTask>();

  const { push, pop } = useNavigation();

  const { data, setData, isLoading } = useSyncData();

  const labels = data?.labels;
  const projects = data?.projects;
  const sections = data?.sections;

  const lowestPriority = priorities[priorities.length - 1];

  const { handleSubmit, itemProps, values, focus, reset, setValue } = useForm<CreateTaskValues>({
    async onSubmit(values) {
      if (shouldCloseMainWindow) {
        await closeMainWindow({ popToRootType: PopToRootType.Suspended });
      }

      const toast = new Toast({ style: Toast.Style.Animated, title: "Creating task" });
      await toast.show();

      try {
        // Clean content by removing embedded project names and assignees when selected via form
        let cleanContent = values.content;

        // Remove project references from content if project is selected via dropdown
        if (values.projectId && projects) {
          const selectedProject = projects.find((p) => p.id === values.projectId);
          if (selectedProject) {
            // Remove both quoted and unquoted project references
            // Create regex to match both #Project and #"Project Name" formats
            const escapedName = selectedProject.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const projectRegex = new RegExp(`#(?:"${escapedName}"|#${escapedName})`, "gi");
            cleanContent = cleanContent.replace(projectRegex, "").trim();
          }
        }

        // Use addTask API with structured parameters for reliable assignment
        const taskData = await addTask(
          {
            content: cleanContent,
            description: values.description || undefined,
            project_id: values.projectId || undefined,
            responsible_uid: values.responsibleUid || undefined,
            labels: Array.isArray(values.labels) && values.labels.length > 0 ? values.labels : undefined,
            priority: parseInt(values.priority),
            section_id: values.sectionId || undefined,
            parent_id: values.parentId || undefined,
            due: values.date ? { date: values.date.toLocaleDateString("en-CA") } : undefined,
            deadline: values.deadline ? { date: values.deadline.toLocaleDateString("en-CA") } : undefined,
            duration:
              values.duration && values.date && !values.date.toDateString().includes(":")
                ? {
                    unit: "minute" as const,
                    amount: parseInt(values.duration),
                  }
                : undefined,
          },
          { data, setData },
        );

        const id = taskData.id;

        toast.style = Toast.Style.Success;
        toast.title = "Task created";

        if (id) {
          toast.primaryAction = {
            title: "Open Task",
            shortcut: { modifiers: ["cmd"], key: "o" },
            onAction: () => push(<TaskDetail taskId={id} />),
          };

          const isInstalled = await isTodoistInstalled();
          toast.secondaryAction = {
            title: `Open Task`,
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: async () => {
              open(isInstalled ? getTaskAppUrl(id) : getTaskUrl(id));
            },
          };

          if (Array.isArray(values.files) && values.files.length > 0) {
            try {
              toast.message = "Uploading file and adding to comment…";
              const file = await uploadFile(values.files[0]);
              await addComment({ item_id: id, file_attachment: file, content: "" }, { data, setData });
              toast.message = "File uploaded and added to comment";
            } catch {
              toast.message = `Failed uploading file and adding to comment`;
            }
          }
        }

        if (fromProjectId) {
          pop();
        }

        reset({
          content: "",
          description: "",
          date: null,
          deadline: null,
          priority: String(lowestPriority.value),
          projectId: "",
          sectionId: "",
          responsibleUid: "",
          labels: [],
          files: [],
          parentId: "",
        });

        focus("content");
      } catch (error) {
        await showFailureToast(error, { title: "Unable to create task" });
      } finally {
        if (shouldCloseMainWindow) {
          await popToRoot();
        }
      }
    },
    initialValues: {
      content: draftValues?.content,
      description: draftValues?.description,
      date: draftValues?.date ?? (fromTodayEmptyView ? new Date() : null),
      deadline: draftValues?.deadline ?? null,
      duration: draftValues?.duration ?? "",
      priority: draftValues?.priority ?? String(lowestPriority.value),
      projectId: draftValues?.projectId ?? fromProjectId ?? "",
      sectionId: draftValues?.sectionId ?? "",
      responsibleUid: draftValues?.responsibleUid ?? "",
      labels: draftValues?.labels ?? (fromLabel ? [fromLabel] : []),
      files: draftValues?.files ?? [],
      parentId: draftValues?.parentId ?? "",
    },
    validation: {
      content: FormValidation.Required,
      duration: (value) => {
        if (value && Number.isNaN(parseInt(value, 10))) {
          return "Duration must be a number";
        }
      },
    },
  });

  // Real-time NLP parsing
  const parsedData = useNLPParser(values.content, projects, labels);

  // Helper functions to update title based on dropdown changes
  const updateTitleWithPriority = (newPriority: string) => {
    let updatedContent = values.content;

    // Find and replace only the LAST priority pattern
    const priorityRegex = /\bp[1-4]\b/gi;
    const matches = Array.from(updatedContent.matchAll(priorityRegex));

    if (matches.length > 0) {
      // Replace only the last priority match
      const lastMatch = matches[matches.length - 1];
      const beforeMatch = updatedContent.substring(0, lastMatch.index);
      const afterMatch = updatedContent.substring(lastMatch.index! + lastMatch[0].length);

      // Add new priority if not default, otherwise just remove the old one
      const priorityNumber = parseInt(newPriority);
      if (priorityNumber && priorityNumber !== lowestPriority.value) {
        // Convert Todoist priority to user format: 4->p1, 3->p2, 2->p3, 1->p4
        const priorityMap: Record<number, string> = { 4: "p1", 3: "p2", 2: "p3", 1: "p4" };
        const priorityText = priorityMap[priorityNumber];
        if (priorityText) {
          updatedContent = `${beforeMatch}${priorityText}${afterMatch}`.replace(/\s+/g, " ").trim();
        } else {
          updatedContent = `${beforeMatch}${afterMatch}`.replace(/\s+/g, " ").trim();
        }
      } else {
        updatedContent = `${beforeMatch}${afterMatch}`.replace(/\s+/g, " ").trim();
      }
    } else {
      // No existing priority to replace, add new priority at the end if not default
      const priorityNumber = parseInt(newPriority);
      if (priorityNumber && priorityNumber !== lowestPriority.value) {
        // Convert Todoist priority to user format: 4->p1, 3->p2, 2->p3, 1->p4
        const priorityMap: Record<number, string> = { 4: "p1", 3: "p2", 2: "p3", 1: "p4" };
        const priorityText = priorityMap[priorityNumber];
        if (priorityText) {
          updatedContent = `${updatedContent.trim()} ${priorityText}`.trim();
        }
      }
    }

    setValue("content", updatedContent);
  };

  const updateTitleWithProject = (newProjectId: string) => {
    let updatedContent = values.content;

    // Use the same smart project detection logic as the NLP parser
    const projectRegex = /#(?:"([^"]+)"|([a-zA-Z0-9_\u00A0-\uFFFF]+(?:\s+[a-zA-Z0-9_\u00A0-\uFFFF]+)*))/g;
    const projectMatches = Array.from(updatedContent.matchAll(projectRegex));

    if (projectMatches.length > 0) {
      // Find the last valid project match using the same logic as NLP parser
      let lastValidMatch = null;

      for (let i = projectMatches.length - 1; i >= 0; i--) {
        const match = projectMatches[i];
        const candidateName = match[1] || match[2]; // match[1] is quoted, match[2] is unquoted

        // For unquoted matches, try shortest possible matches first
        if (!match[1] && match[2] && projects) {
          const words = candidateName.split(/\s+/);

          // Try progressively longer combinations starting from single word
          for (let wordCount = 1; wordCount <= words.length; wordCount++) {
            const testName = words.slice(0, wordCount).join(" ");

            const matchingProject = projects.find((project) => {
              return project.name.toLowerCase() === testName.toLowerCase();
            });

            if (matchingProject) {
              lastValidMatch = {
                ...match,
                actualLength: match.index + `#${testName}`.length,
                projectName: testName,
              };
              break;
            }
          }

          if (lastValidMatch) break;
        } else if (match[1] && projects) {
          // For quoted matches, use the full quoted content
          const matchingProject = projects.find((project) => {
            return project.name.toLowerCase() === candidateName.toLowerCase();
          });

          if (matchingProject) {
            lastValidMatch = {
              ...match,
              actualLength: match.index + match[0].length,
              projectName: candidateName,
            };
            break;
          }
        }
      }

      if (lastValidMatch) {
        // Replace only the valid project match
        const beforeMatch = updatedContent.substring(0, lastValidMatch.index);
        const afterMatch = updatedContent.substring(lastValidMatch.actualLength);

        if (newProjectId && projects) {
          const project = projects.find((p) => p.id === newProjectId);
          if (project) {
            const projectName = project.name;
            const projectText = projectName.includes(" ") ? `#"${projectName}"` : `#${projectName}`;
            updatedContent = `${beforeMatch}${projectText}${afterMatch}`.replace(/\s+/g, " ").trim();
          } else {
            updatedContent = `${beforeMatch}${afterMatch}`.replace(/\s+/g, " ").trim();
          }
        } else {
          updatedContent = `${beforeMatch}${afterMatch}`.replace(/\s+/g, " ").trim();
        }
      }
    } else if (newProjectId && projects) {
      // No existing project to replace, add new project at the end
      const project = projects.find((p) => p.id === newProjectId);
      if (project) {
        const projectName = project.name;
        const projectText = projectName.includes(" ") ? `#"${projectName}"` : `#${projectName}`;
        updatedContent = `${updatedContent.trim()} ${projectText}`.trim();
      }
    }

    setValue("content", updatedContent);
  };

  const updateTitleWithLabels = (newLabels: string[]) => {
    let updatedContent = values.content;

    if (labels) {
      // Find and remove all valid label matches using smart detection
      const validMatches: Array<{ index: number; length: number; name: string }> = [];

      // First, find all quoted labels @"label name"
      const quotedRegex = /@"([^"]+)"/g;
      let match;
      while ((match = quotedRegex.exec(updatedContent)) !== null) {
        const labelName = match[1];
        const matchingLabel = findBestLabelMatch(labels, labelName);

        if (matchingLabel) {
          validMatches.push({
            index: match.index,
            length: match[0].length,
            name: labelName,
          });
        }
      }

      // Then, find unquoted labels by scanning for @ and trying progressive matches
      const atRegex = /@/g;
      let atMatch;
      while ((atMatch = atRegex.exec(updatedContent)) !== null) {
        const startIndex = atMatch.index;

        // Skip if this @ is already part of a quoted label we found
        const isPartOfQuoted = validMatches.some((vm) => startIndex >= vm.index && startIndex < vm.index + vm.length);
        if (isPartOfQuoted) continue;

        // Extract text after @ until we hit whitespace or special characters
        const afterAt = updatedContent.substring(startIndex + 1);
        const textMatch = afterAt.match(/^[a-zA-Z0-9_\u00A0-\uFFFF\s]*/);

        if (textMatch) {
          const candidateText = textMatch[0];
          const words = candidateText
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);

          // Try progressively longer combinations starting from single word
          for (let wordCount = 1; wordCount <= words.length; wordCount++) {
            const testName = words.slice(0, wordCount).join(" ");

            const matchingLabel = findBestLabelMatch(labels, testName);

            if (matchingLabel) {
              validMatches.push({
                index: startIndex,
                length: `@${testName}`.length,
                name: testName,
              });
              break; // Take the shortest match
            }
          }
        }
      }

      // Remove duplicates and sort by index (reverse order for removal)
      const uniqueMatches = validMatches.filter(
        (match, index, array) => array.findIndex((m) => m.index === match.index) === index,
      );
      uniqueMatches.sort((a, b) => b.index - a.index);

      // Remove valid matches in reverse order to maintain indices
      for (const match of uniqueMatches) {
        const before = updatedContent.substring(0, match.index);
        const after = updatedContent.substring(match.index + match.length);
        updatedContent = `${before}${after}`.replace(/\s+/g, " ").trim();
      }
    }

    // Add new labels
    if (newLabels && newLabels.length > 0) {
      const labelTexts = newLabels.map((label) => {
        // Use quotes if label has spaces
        return label.includes(" ") ? `@"${label}"` : `@${label}`;
      });
      updatedContent = `${updatedContent.trim()} ${labelTexts.join(" ")}`.trim();
    }

    setValue("content", updatedContent);
  };

  const updateTitleWithDate = (newDate: Date | null) => {
    let updatedContent = values.content;

    // Remove the LAST date occurrence if we know what it is from the parser
    if (parsedData.dateString) {
      // Create a regex to match the exact date string that was parsed
      const escapedDateString = parsedData.dateString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const dateRegex = new RegExp(`\\b${escapedDateString}\\b`, "gi");

      // Find all matches and replace only the last one
      const matches = Array.from(updatedContent.matchAll(dateRegex));
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const beforeMatch = updatedContent.substring(0, lastMatch.index);
        const afterMatch = updatedContent.substring(lastMatch.index! + lastMatch[0].length);

        // Add new date if provided, otherwise just remove the old one
        if (newDate) {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);

          let dateText = "";
          if (newDate.toDateString() === today.toDateString()) {
            dateText = "today";
          } else if (newDate.toDateString() === tomorrow.toDateString()) {
            dateText = "tomorrow";
          } else {
            // Format as "Jan 15" or similar
            dateText = newDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }

          updatedContent = `${beforeMatch}${dateText}${afterMatch}`.replace(/\s+/g, " ").trim();
        } else {
          updatedContent = `${beforeMatch}${afterMatch}`.replace(/\s+/g, " ").trim();
        }
      }
    } else if (newDate) {
      // No existing date to replace, add new date at the end
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      let dateText = "";
      if (newDate.toDateString() === today.toDateString()) {
        dateText = "today";
      } else if (newDate.toDateString() === tomorrow.toDateString()) {
        dateText = "tomorrow";
      } else {
        // Format as "Jan 15" or similar
        dateText = newDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      updatedContent = `${updatedContent.trim()} ${dateText}`.trim();
    }

    setValue("content", updatedContent);
  };

  const updateTitleWithDeadline = (newDeadline: Date | null) => {
    let updatedContent = values.content;

    // Find and replace only the LAST deadline pattern
    const deadlineRegex = /\{[^}]*\}/g;
    const matches = Array.from(updatedContent.matchAll(deadlineRegex));

    if (matches.length > 0) {
      // Replace only the last deadline match
      const lastMatch = matches[matches.length - 1];
      const beforeMatch = updatedContent.substring(0, lastMatch.index);
      const afterMatch = updatedContent.substring(lastMatch.index! + lastMatch[0].length);

      // Add new deadline if provided, otherwise just remove the old one
      if (newDeadline) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let deadlineText = "";
        if (newDeadline.toDateString() === today.toDateString()) {
          deadlineText = "{today}";
        } else if (newDeadline.toDateString() === tomorrow.toDateString()) {
          deadlineText = "{tomorrow}";
        } else {
          // Format as "{Jan 15}" or similar
          const dateStr = newDeadline.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          deadlineText = `{${dateStr}}`;
        }

        updatedContent = `${beforeMatch}${deadlineText}${afterMatch}`.replace(/\s+/g, " ").trim();
      } else {
        updatedContent = `${beforeMatch}${afterMatch}`.replace(/\s+/g, " ").trim();
      }
    } else if (newDeadline) {
      // No existing deadline to replace, add new deadline at the end
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      let deadlineText = "";
      if (newDeadline.toDateString() === today.toDateString()) {
        deadlineText = "{today}";
      } else if (newDeadline.toDateString() === tomorrow.toDateString()) {
        deadlineText = "{tomorrow}";
      } else {
        // Format as "{Jan 15}" or similar
        const dateStr = newDeadline.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        deadlineText = `{${dateStr}}`;
      }

      updatedContent = `${updatedContent.trim()} ${deadlineText}`.trim();
    }

    setValue("content", updatedContent);
  };

  // Track last action timestamps for each field
  // This implements "last action wins" logic where whichever happened most recently
  // (manual field selection or NLP parsing from typing) takes precedence
  //
  // Example scenarios:
  // 1. User types "tomorrow p1" -> NLP sets date and priority
  // 2. User manually changes priority -> manual priority overrides NLP
  // 3. User types "friday" -> if typing happened after manual change, NLP wins again
  // 4. This ensures the most recent user intent is always respected
  const lastActionRef = useRef<{
    priority: { source: "nlp" | "manual"; timestamp: number };
    projectId: { source: "nlp" | "manual"; timestamp: number };
    date: { source: "nlp" | "manual"; timestamp: number };
    deadline: { source: "nlp" | "manual"; timestamp: number };
    labels: { source: "nlp" | "manual"; timestamp: number };
    contentChanged: number; // Track when content was last changed for NLP parsing
  }>({
    priority: { source: "nlp", timestamp: 0 },
    projectId: { source: "nlp", timestamp: 0 },
    date: { source: "nlp", timestamp: 0 },
    deadline: { source: "nlp", timestamp: 0 },
    labels: { source: "nlp", timestamp: 0 },
    contentChanged: 0,
  });

  // Previous values to detect manual changes
  const prevValuesRef = useRef(values);

  // Detect manual field changes and update both tracking AND title
  useEffect(() => {
    const now = Date.now();
    const prev = prevValuesRef.current;

    // Detect manual priority change
    if (values.priority !== prev.priority) {
      lastActionRef.current.priority = { source: "manual", timestamp: now };
      // Update title to reflect manual priority change
      if (now - lastActionRef.current.contentChanged > 100) {
        // Debounce to avoid loops
        updateTitleWithPriority(values.priority);
      }
    }

    // Detect manual project change
    if (values.projectId !== prev.projectId) {
      lastActionRef.current.projectId = { source: "manual", timestamp: now };
      // Update title to reflect manual project change
      if (now - lastActionRef.current.contentChanged > 100) {
        // Debounce to avoid loops
        updateTitleWithProject(values.projectId);
      }
    }

    // Detect manual date change
    if (values.date?.getTime() !== prev.date?.getTime()) {
      lastActionRef.current.date = { source: "manual", timestamp: now };
      // Update title to reflect manual date change
      if (now - lastActionRef.current.contentChanged > 100) {
        // Debounce to avoid loops
        updateTitleWithDate(values.date);
      }
    }

    // Detect manual deadline change
    if (values.deadline?.getTime() !== prev.deadline?.getTime()) {
      lastActionRef.current.deadline = { source: "manual", timestamp: now };
      // Update title to reflect manual deadline change
      if (now - lastActionRef.current.contentChanged > 100) {
        // Debounce to avoid loops
        updateTitleWithDeadline(values.deadline);
      }
    }

    // Detect manual labels change
    if (JSON.stringify(values.labels) !== JSON.stringify(prev.labels)) {
      lastActionRef.current.labels = { source: "manual", timestamp: now };
      // Update title to reflect manual labels change
      if (now - lastActionRef.current.contentChanged > 100) {
        // Debounce to avoid loops
        updateTitleWithLabels(values.labels);
      }
    }

    // Track content changes for NLP timing
    if (values.content !== prev.content) {
      lastActionRef.current.contentChanged = now;
    }

    // Update previous values
    prevValuesRef.current = values;
  });

  // Auto-update priority based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.priority.timestamp;

    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.priority !== undefined) {
        setValue("priority", String(parsedData.priority));
        lastActionRef.current.priority = { source: "nlp", timestamp: nlpTimestamp };
      } else {
        // Reset to default priority when parameter is removed from title
        setValue("priority", String(lowestPriority.value));
        lastActionRef.current.priority = { source: "nlp", timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.priority, setValue, lowestPriority.value]);

  // Auto-update project based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.projectId.timestamp;

    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.projectId !== undefined) {
        setValue("projectId", parsedData.projectId);
        lastActionRef.current.projectId = { source: "nlp", timestamp: nlpTimestamp };
      } else {
        // Reset to "No project" when parameter is removed from title
        setValue("projectId", fromProjectId ?? "");
        lastActionRef.current.projectId = { source: "nlp", timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.projectId, setValue, fromProjectId]);

  // Auto-update date based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.date.timestamp;

    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.parsedDate) {
        setValue("date", parsedData.parsedDate);
        lastActionRef.current.date = { source: "nlp", timestamp: nlpTimestamp };
      } else {
        // Reset to null/empty when date parameter is removed from title
        setValue("date", fromTodayEmptyView ? new Date() : null);
        lastActionRef.current.date = { source: "nlp", timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.parsedDate, setValue, fromTodayEmptyView]);

  // Auto-update deadline based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.deadline.timestamp;

    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      if (parsedData.parsedDeadline) {
        setValue("deadline", parsedData.parsedDeadline);
        lastActionRef.current.deadline = { source: "nlp", timestamp: nlpTimestamp };
      } else {
        // Reset to null when deadline parameter is removed from title
        setValue("deadline", null);
        lastActionRef.current.deadline = { source: "nlp", timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.parsedDeadline, setValue]);

  // Track which labels were added via NLP vs manual selection
  const nlpLabelsRef = useRef<string[]>([]);

  // Auto-update labels based on NLP parsing - respect last action
  useEffect(() => {
    const nlpTimestamp = lastActionRef.current.contentChanged;
    const manualTimestamp = lastActionRef.current.labels.timestamp;

    // Only update if NLP parsing is more recent than last manual change
    if (nlpTimestamp > manualTimestamp) {
      const currentLabels = values.labels || [];
      const initialLabels = fromLabel ? [fromLabel] : [];

      if (parsedData.labels && parsedData.labels.length > 0) {
        // Remove old NLP labels and add new ones
        const manualLabels = currentLabels.filter((label) => !nlpLabelsRef.current.includes(label));
        const newLabels = [...new Set([...manualLabels, ...parsedData.labels])];

        setValue("labels", newLabels);
        nlpLabelsRef.current = parsedData.labels;
        lastActionRef.current.labels = { source: "nlp", timestamp: nlpTimestamp };
      } else {
        // Remove only NLP-added labels when all label parameters are removed from title
        const manualLabels = currentLabels.filter((label) => !nlpLabelsRef.current.includes(label));
        const resetLabels = [...new Set([...initialLabels, ...manualLabels])];

        setValue("labels", resetLabels);
        nlpLabelsRef.current = [];
        lastActionRef.current.labels = { source: "nlp", timestamp: nlpTimestamp };
      }
    }
  }, [parsedData.labels, setValue, values.labels, fromLabel]);

  const projectSections = sections?.filter((section) => section.project_id === values.projectId);

  const collaborators = getProjectCollaborators(values.projectId, data);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} icon={Icon.Plus} />
          <RefreshAction />
        </ActionPanel>
      }
      enableDrafts={!fromProjectId && !fromTodayEmptyView && !fromLabel}
    >
      <Form.TextField
        {...itemProps.content}
        title="Title"
        placeholder="Buy milk tomorrow p1 #Personal @This Month {march 30}"
        info='✨ Smart Task Creation: Type naturally and watch the form fill itself! Try &apos;Buy groceries tomorrow p2 #Home @urgent&apos; or use the dropdowns below - both ways work together seamlessly.

🎯 What you can type:
• Priority: p1 (urgent), p2 (high), p3 (medium), p4 (low)
• Projects: #ProjectName or #"Project Name" (for names with spaces)
• Labels: @label or @"Label Name" (for names with spaces)
• Dates: tomorrow, next Friday, Monday at 3pm, in 2 weeks
• Deadlines: {March 30} or {next month}

💡 The form updates as you type, and any changes in the dropdowns will update your title too!'
      />

      <Form.TextArea
        {...itemProps.description}
        title="Description"
        placeholder="Apples, pears, and strawberries (Markdown supported)"
        enableMarkdown
      />

      <Form.Separator />

      <Form.DatePicker {...itemProps.date} title="Date" />

      {values.date && !Form.DatePicker.isFullDay(values.date) ? (
        <Form.TextField {...itemProps.duration} title="Duration (minutes)" />
      ) : null}

      {data?.user?.premium_status !== "not_premium" ? (
        <Form.DatePicker {...itemProps.deadline} title="Deadline" type={Form.DatePicker.Type.Date} />
      ) : null}

      <Form.Dropdown {...itemProps.priority} title="Priority">
        {priorities.map(({ value, name, color, icon }) => (
          <Form.Dropdown.Item
            value={String(value)}
            title={name}
            key={value}
            icon={{ source: icon ? icon : Icon.Dot, tintColor: color }}
          />
        ))}
      </Form.Dropdown>

      {projects && projects.length > 0 ? (
        <Form.Dropdown {...itemProps.projectId} title="Project">
          <Form.Dropdown.Item title="No project" value="" icon={Icon.List} />

          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              icon={getProjectIcon(project)}
              title={project.name}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {projectSections && projectSections.length > 0 ? (
        <Form.Dropdown {...itemProps.sectionId} title="Section">
          <Form.Dropdown.Item
            value=""
            title="No section"
            icon={{ source: "section.svg", tintColor: Color.PrimaryText }}
          />

          {projectSections.map(({ id, name }) => (
            <Form.Dropdown.Item
              key={id}
              value={id}
              title={name}
              icon={{ source: "section.svg", tintColor: Color.PrimaryText }}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {collaborators && collaborators.length > 0 ? (
        <Form.Dropdown {...itemProps.responsibleUid} title="Assignee">
          <Form.Dropdown.Item icon={Icon.Person} value="" title="Unassigned" />

          {collaborators.map((collaborator) => (
            <Form.Dropdown.Item
              key={collaborator.id}
              value={collaborator.id}
              title={collaborator.full_name}
              icon={getCollaboratorIcon(collaborator)}
            />
          ))}
        </Form.Dropdown>
      ) : null}

      {labels && labels.length > 0 ? (
        <Form.TagPicker {...itemProps.labels} title="Labels">
          {labels.map(({ id, name, color }) => (
            <Form.TagPicker.Item
              key={id}
              value={name}
              title={name}
              icon={{ source: Icon.Tag, tintColor: getColorByKey(color).value }}
            />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.Separator />

      <Form.FilePicker {...itemProps.files} title="File" canChooseDirectories={false} allowMultipleSelection={false} />

      <Form.Dropdown {...itemProps.parentId} title="Parent Task">
        <Form.Dropdown.Item value="" title="None" />

        {data?.items.map((item) => {
          return <Form.Dropdown.Item key={item.id} title={item.content} icon={getPriorityIcon(item)} value={item.id} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

/**
 * Finds the best matching label using tiered matching strategy:
 * 1. Exact match (case-sensitive, with emojis)
 * 2. Case-insensitive match (with emojis)
 * 3. Emoji-insensitive match (case-sensitive)
 * 4. Fully normalized match (case-insensitive, no emojis)
 */
function findBestLabelMatch(labels: Label[], userInput: string): Label | undefined {
  const trimmedInput = userInput.trim();

  // Tier 1: Exact match (case-sensitive, with emojis)
  let match = labels.find((label) => label.name === trimmedInput);
  if (match) return match;

  // Tier 2: Case-insensitive match (with emojis)
  match = labels.find((label) => label.name.toLowerCase() === trimmedInput.toLowerCase());
  if (match) return match;

  // Tier 3: Emoji-insensitive match (case-sensitive)
  const inputWithoutEmojis = removeEmojis(trimmedInput);
  match = labels.find((label) => removeEmojis(label.name) === inputWithoutEmojis);
  if (match) return match;

  // Tier 4: Fully normalized match (case-insensitive, no emojis)
  const normalizedInput = normalizeLabelName(trimmedInput);
  match = labels.find((label) => normalizeLabelName(label.name) === normalizedInput);

  return match;
}

/**
 * Removes emojis from a string using the same regex as normalization functions
 */
function removeEmojis(text: string): string {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

  return text.replace(emojiRegex, "").trim();
}

/**
 * Normalizes label name by converting to lowercase and removing emojis
 */
function normalizeLabelName(name: string): string {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

  return name
    .replace(emojiRegex, "") // Remove emojis
    .toLowerCase() // Convert to lowercase
    .trim(); // Remove leading/trailing whitespace
}

export default withTodoistApi(CreateTask);
