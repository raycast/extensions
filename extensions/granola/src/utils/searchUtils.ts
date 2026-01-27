import { Company, Person } from "./types";
import { hasWorkEmailDomain } from "./emailDomainUtils";

export type PeopleSortOption = "name" | "last-meeting" | "meeting-count" | "company";
export type CompanySortOption = "name" | "people-count" | "meeting-count" | "last-meeting";

export interface FolderNoteFolder {
  id: string;
  document_ids?: string[];
}

export interface FolderNoteResults<T extends { id: string }> {
  filteredNotes: T[];
  notesNotInFolders: T[];
  folderNoteCounts: Record<string, number>;
}

export const getFolderNoteResults = <T extends { id: string }>(
  notes: T[],
  folders: FolderNoteFolder[],
  selectedFolder: string,
): FolderNoteResults<T> => {
  if (notes.length === 0) {
    return {
      filteredNotes: [],
      notesNotInFolders: [],
      folderNoteCounts: {} as Record<string, number>,
    };
  }

  const noteIds = new Set<string>();
  for (let i = 0; i < notes.length; i++) {
    noteIds.add(notes[i].id);
  }

  const notesInFolders = new Set<string>();
  const counts: Record<string, number> = {};

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    const documentIds = folder.document_ids || [];
    if (documentIds.length > 0) {
      let count = 0;
      for (let j = 0; j < documentIds.length; j++) {
        const id = documentIds[j];
        if (noteIds.has(id)) {
          count++;
          notesInFolders.add(id);
        }
      }
      counts[folder.id] = count;
    } else {
      counts[folder.id] = 0;
    }
  }

  const orphanNotes: T[] = [];
  for (let i = 0; i < notes.length; i++) {
    if (!notesInFolders.has(notes[i].id)) {
      orphanNotes.push(notes[i]);
    }
  }

  let filtered: T[];
  if (selectedFolder === "all") {
    filtered = notes;
  } else if (selectedFolder === "orphans") {
    filtered = orphanNotes;
  } else {
    const folder = folders.find((entry) => entry.id === selectedFolder);
    if (!folder || !folder.document_ids || folder.document_ids.length === 0) {
      filtered = [];
    } else {
      filtered = [];
      const folderDocIds = new Set(folder.document_ids);
      for (let i = 0; i < notes.length; i++) {
        if (folderDocIds.has(notes[i].id)) {
          filtered.push(notes[i]);
        }
      }
    }
  }

  return {
    filteredNotes: filtered,
    notesNotInFolders: orphanNotes,
    folderNoteCounts: counts,
  };
};

export const sortPeople = (people: Person[], sortBy: PeopleSortOption): Person[] => {
  const filteredPeople = people.filter(hasWorkEmailDomain);
  const peopleCopy = [...filteredPeople];

  switch (sortBy) {
    case "name":
      return peopleCopy.sort((a, b) => a.name.localeCompare(b.name));
    case "last-meeting":
      return peopleCopy.sort((a, b) => {
        const dateA = a.lastMeetingDate || "";
        const dateB = b.lastMeetingDate || "";
        return dateB.localeCompare(dateA);
      });
    case "meeting-count":
      return peopleCopy.sort((a, b) => (b.meetingCount || 0) - (a.meetingCount || 0));
    case "company":
      return peopleCopy.sort((a, b) => {
        const companyA = a.company_name || "zzz";
        const companyB = b.company_name || "zzz";
        return companyA.localeCompare(companyB);
      });
    default:
      return peopleCopy;
  }
};

export const formatLastMeetingLabel = (
  lastMeetingDate?: string,
  now: Date = new Date(),
): { text: string; tooltip: string } | null => {
  if (!lastMeetingDate) {
    return null;
  }

  const date = new Date(lastMeetingDate);
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  let formattedDate: string;
  if (daysDiff === 0) {
    formattedDate = "Today";
  } else if (daysDiff === 1) {
    formattedDate = "Yesterday";
  } else if (daysDiff < 7) {
    formattedDate = date.toLocaleDateString("en-US", { weekday: "long" });
  } else {
    formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return {
    text: formattedDate,
    tooltip: `Last meeting: ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
  };
};

const isDomainCompanyName = (name: string): boolean => name.includes(".") && !name.includes(" ");

export const isWorkCompany = (company: Company): boolean => {
  if (isDomainCompanyName(company.name)) {
    return true;
  }

  return company.people.some(hasWorkEmailDomain);
};

export const sortCompanies = (companies: Company[], sortBy: CompanySortOption): Company[] => {
  const filteredCompanies: Company[] = [];
  for (let i = 0; i < companies.length; i++) {
    if (isWorkCompany(companies[i])) {
      filteredCompanies.push(companies[i]);
    }
  }

  switch (sortBy) {
    case "name":
      filteredCompanies.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "people-count":
      filteredCompanies.sort((a, b) => b.people.length - a.people.length);
      break;
    case "meeting-count":
      filteredCompanies.sort((a, b) => (b.totalMeetings || 0) - (a.totalMeetings || 0));
      break;
    case "last-meeting":
      filteredCompanies.sort((a, b) => {
        const dateA = a.lastMeetingDate || "";
        const dateB = b.lastMeetingDate || "";
        return dateB.localeCompare(dateA);
      });
      break;
  }

  return filteredCompanies;
};

export const formatCompanyMeetingDate = (value?: string): string => {
  if (!value) return "Unknown date";
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "Unknown date";
  return dateValue.toLocaleDateString();
};
