import { project, task, typeOfWork } from "./FetchData";

export const mockProjects: project[] = [
  {
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
  {
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
  {
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
  {
    name: "Canyon Brand Page",
    id: "103",
    isBillableByDefault: false,
    company: {
      id: "202",
      name: "Canyon Bicycles GmbH",
    },
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
];
