import { LocalStorage } from "@raycast/api";
import { ClassType, Class, Assignment } from "./types";

const STORAGE_KEYS = {
  CLASS_TYPES: "classTypes",
  CLASSES: "classes",
  ASSIGNMENTS: "assignments",
  INITIALIZED: "initialized",
};

// Initialize default class types
const DEFAULT_CLASS_TYPES: ClassType[] = [
  {
    id: "academic",
    name: "Academic",
    majorWeight: 50,
    minorWeight: 50,
  },
  {
    id: "honors",
    name: "Honors",
    majorWeight: 60,
    minorWeight: 40,
  },
  {
    id: "ap",
    name: "AP",
    majorWeight: 70,
    minorWeight: 30,
  },
];

export async function initializeStorage(): Promise<void> {
  const initialized = await LocalStorage.getItem<string>(STORAGE_KEYS.INITIALIZED);

  if (!initialized) {
    await LocalStorage.setItem(STORAGE_KEYS.CLASS_TYPES, JSON.stringify(DEFAULT_CLASS_TYPES));
    await LocalStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([]));
    await LocalStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify([]));
    await LocalStorage.setItem(STORAGE_KEYS.INITIALIZED, "true");
  }
}

// ClassType storage functions
export async function getClassTypes(): Promise<ClassType[]> {
  await initializeStorage();
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.CLASS_TYPES);
  return data ? JSON.parse(data) : DEFAULT_CLASS_TYPES;
}

export async function saveClassTypes(classTypes: ClassType[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.CLASS_TYPES, JSON.stringify(classTypes));
}

export async function addClassType(classType: ClassType): Promise<void> {
  const classTypes = await getClassTypes();
  classTypes.push(classType);
  await saveClassTypes(classTypes);
}

export async function updateClassType(updatedClassType: ClassType): Promise<void> {
  const classTypes = await getClassTypes();
  const index = classTypes.findIndex((ct) => ct.id === updatedClassType.id);
  if (index !== -1) {
    classTypes[index] = updatedClassType;
    await saveClassTypes(classTypes);
  }
}

export async function deleteClassType(id: string): Promise<void> {
  const classTypes = await getClassTypes();
  const filtered = classTypes.filter((ct) => ct.id !== id);
  await saveClassTypes(filtered);
}

// Class storage functions
export async function getClasses(): Promise<Class[]> {
  await initializeStorage();
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.CLASSES);
  return data ? JSON.parse(data) : [];
}

export async function saveClasses(classes: Class[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
}

export async function addClass(classItem: Class): Promise<void> {
  const classes = await getClasses();
  classes.push(classItem);
  await saveClasses(classes);
}

export async function updateClass(updatedClass: Class): Promise<void> {
  const classes = await getClasses();
  const index = classes.findIndex((c) => c.id === updatedClass.id);
  if (index !== -1) {
    classes[index] = updatedClass;
    await saveClasses(classes);
  }
}

export async function deleteClass(id: string): Promise<void> {
  const classes = await getClasses();
  const filtered = classes.filter((c) => c.id !== id);
  await saveClasses(filtered);

  // Also delete all assignments for this class
  const assignments = await getAssignments();
  const filteredAssignments = assignments.filter((a) => a.classId !== id);
  await saveAssignments(filteredAssignments);
}

// Assignment storage functions
export async function getAssignments(): Promise<Assignment[]> {
  await initializeStorage();
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.ASSIGNMENTS);
  return data ? JSON.parse(data) : [];
}

export async function saveAssignments(assignments: Assignment[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
}

export async function addAssignment(assignment: Assignment): Promise<void> {
  const assignments = await getAssignments();
  assignments.push(assignment);
  await saveAssignments(assignments);
}

export async function updateAssignment(updatedAssignment: Assignment): Promise<void> {
  const assignments = await getAssignments();
  const index = assignments.findIndex((a) => a.id === updatedAssignment.id);
  if (index !== -1) {
    assignments[index] = updatedAssignment;
    await saveAssignments(assignments);
  }
}

export async function deleteAssignment(id: string): Promise<void> {
  const assignments = await getAssignments();
  const filtered = assignments.filter((a) => a.id !== id);
  await saveAssignments(filtered);
}

export async function getAssignmentsForClass(classId: string): Promise<Assignment[]> {
  const assignments = await getAssignments();
  return assignments.filter((a) => a.classId === classId);
}
