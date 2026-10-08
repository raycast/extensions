import { project, ProjectMember, task, TaskList, TaskStatus, typeOfWork } from "./FetchData";

export const mockProjects: project[] = [
  {
    name: "awork Extension for Raycast",
    id: "100",
    isBillableByDefault: false,
    company: {
      id: "200",
      name: "Hypercode GmbH",
    },
    projectKey: "AW-RAY",
    projectStatus: {
      type: "progress",
    },
  },
  {
    name: "hypercode.de Website",
    id: "101",
    isBillableByDefault: false,
    company: {
      id: "200",
      name: "Hypercode GmbH",
    },
    projectKey: "HC-WEB",
    projectStatus: {
      type: "progress",
    },
  },
  {
    name: "Basler Website",
    id: "102",
    isBillableByDefault: false,
    company: {
      id: "201",
      name: "Basler AG",
    },
    projectKey: "BSL-WEB",
    projectStatus: {
      type: "progress",
    },
  },
  {
    name: "Canyon Brand Page",
    id: "103",
    isBillableByDefault: false,
    company: {
      id: "202",
      name: "Canyon Bicycles GmbH",
    },
    projectKey: "CYN-WEB",
    projectStatus: {
      type: "progress",
    },
  },
  {
    name: "FairMate App",
    id: "104",
    isBillableByDefault: false,
    company: {
      id: "203",
      name: "dimedis GmbH",
    },
    projectKey: "FM-APP",
    projectStatus: {
      type: "progress",
    },
  },
  {
    name: "LeadMate App",
    id: "105",
    isBillableByDefault: false,
    company: {
      id: "203",
      name: "dimedis GmbH",
    },
    projectKey: "LM-APP",
    projectStatus: {
      type: "progress",
    },
  },
  {
    name: "KMS TEAM Project Management",
    id: "106",
    isBillableByDefault: false,
    company: {
      id: "204",
      name: "KMS TEAM GmbH",
    },
    projectKey: "KMS",
    projectStatus: {
      type: "progress",
    },
  },
  {
    name: "Walzwerk App",
    id: "107",
    isBillableByDefault: false,
    company: {
      id: "205",
      name: "Uebemann Rohr- und Walzwerk GmbH und Co KG",
    },
    projectKey: "WALZ",
    projectStatus: {
      type: "closed",
    },
  },
];

export const mockTasks: task[] = [
  {
    id: "300",
    name: "Publish extension",
    projectId: "100",
    project: {
      name: "awork Extension for Raycast",
      id: "100",
      isBillableByDefault: false,
      company: {
        id: "200",
        name: "Hypercode GmbH",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "AW-RAY-15",
    taskStatus: {
      type: "done",
      icon: "",
    },
  },
  {
    id: "301",
    name: "Write blog post about awork Extension for Raycast",
    projectId: "101",
    project: {
      name: "hypercode.de Website",
      id: "101",
      isBillableByDefault: false,
      company: {
        id: "200",
        name: "Hypercode GmbH",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "HC-WEB-105",
    taskStatus: {
      type: "review",
      icon: "",
    },
  },
  {
    id: "302",
    name: "UX/UI for PDP",
    projectId: "102",
    project: {
      name: "Basler Website",
      id: "102",
      isBillableByDefault: false,
      company: {
        id: "201",
        name: "Basler AG",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "BSL-WEB-273",
    taskStatus: {
      type: "progress",
      icon: "",
    },
  },
  {
    id: "303",
    name: "Frontend development for PDP",
    projectId: "102",
    project: {
      name: "Basler Website",
      id: "102",
      isBillableByDefault: false,
      company: {
        id: "201",
        name: "Basler AG",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "BSL-WEB-274",
    taskStatus: {
      type: "progress",
      icon: "",
    },
  },
  {
    id: "304",
    name: "Implement ticketing",
    projectId: "104",
    project: {
      name: "FairMate App",
      id: "104",
      isBillableByDefault: false,
      company: {
        id: "203",
        name: "dimedis GmbH",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "FM-APP-56",
    taskStatus: {
      type: "progress",
      icon: "",
    },
  },
  {
    id: "305",
    name: "Integrate indoor navigation SDK",
    projectId: "104",
    project: {
      name: "FairMate App",
      id: "104",
      isBillableByDefault: false,
      company: {
        id: "203",
        name: "dimedis GmbH",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "FM-APP-57",
    taskStatus: {
      type: "review",
      icon: "",
    },
  },
  {
    id: "306",
    name: "Implement business card scanning",
    projectId: "105",
    project: {
      name: "LeadMate App",
      id: "105",
      isBillableByDefault: false,
      company: {
        id: "203",
        name: "dimedis GmbH",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "LM-APP-80",
    taskStatus: {
      type: "todo",
      icon: "",
    },
  },
  {
    id: "307",
    name: "Create automated tenant import from client source",
    projectId: "107",
    project: {
      name: "Walzwerk App",
      id: "107",
      isBillableByDefault: false,
      company: {
        id: "205",
        name: "Uebemann Rohr- und Walzwerk GmbH und Co KG",
      },
      projectStatus: {
        type: "closed",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "WALZ-26",
    taskStatus: {
      type: "todo",
      icon: "",
    },
  },
  {
    id: "308",
    name: "Feedback for new business inquiry",
    projectId: "106",
    project: {
      name: "KMS TEAM Project Management",
      id: "106",
      isBillableByDefault: false,
      company: {
        id: "204",
        name: "KMS TEAM GmbH",
      },
      projectStatus: {
        type: "progress",
      },
    },
    typeOfWorkId: "400",
    taskIdentifier: "KMS-94",
    taskStatus: {
      type: "done",
      icon: "",
    },
  },
];

export const mockTypeOfWork: typeOfWork[] = [
  {
    id: "400",
    name: "Content creation",
  },
  {
    id: "401",
    name: "Development",
  },
];

export const mockTaskStatuses: TaskStatus[] = [
  { id: "500", name: "To Do", type: "todo", order: 1 },
  { id: "501", name: "In Progress", type: "progress", order: 2 },
  { id: "502", name: "Review", type: "review", order: 3 },
  { id: "503", name: "Done", type: "done", order: 4 },
];

export const mockPrivateTaskStatuses: TaskStatus[] = [
  { id: "510", name: "To Do", type: "todo", order: 1 },
  { id: "511", name: "In Progress", type: "progress", order: 2 },
  { id: "512", name: "Done", type: "done", order: 3 },
];

export const mockTaskLists: TaskList[] = [
  { id: "600", name: "Client Ideas", order: 1, isArchived: false },
  { id: "601", name: "Own Ideas", order: 2, isArchived: false },
  { id: "602", name: "Maintenance", order: 3, isArchived: false },
  { id: "603", name: "Marketing", order: 4, isArchived: false },
];

export const mockProjectMembers: ProjectMember[] = [
  { id: "700", userId: "800", firstName: "Stefan", lastName: "Grund", isDeactivated: false, isExternal: false },
  { id: "701", userId: "801", firstName: "Jan", lastName: "Müller", isDeactivated: false, isExternal: false },
  { id: "702", userId: "802", firstName: "Lisa", lastName: "Schmidt", isDeactivated: false, isExternal: true },
  { id: "703", userId: "803", firstName: "Tom", lastName: "Weber", isDeactivated: true, isExternal: false },
];
