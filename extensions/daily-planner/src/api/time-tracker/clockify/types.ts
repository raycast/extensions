export interface User {
  id: string;
  activeWorkspace: string;
  defaultWorkspace: string;
}

export interface TimeEntry {
  id: string;
  description: string;
  tagIds: string[] | null;
  userId: string;
  billable: boolean;
  taskId: string | null;
  projectId: string | null;
  timeInterval: {
    start: string; // ISO 8601
    end: string | null;
    duration: string | null;
  };
  workspaceId: string;
  // isLocked: boolean;
  // customFieldValues: [];
  // type: string; // 'REGULAR'
  // kioskId: string | null;
}

export interface Project {
  id: string;
  name: string;
  // hourlyRate: {
  //   amount: number;
  //   currency: string;
  // };
  // clientId: string; // "" if there's no client.
  workspaceId: string;
  // billable: boolean;
  // memberships: [ [Object] ];
  // color: string; // e.g., "#FF5722"
  // estimate: {
  //   estimate: string; // e.g., "PT0S"
  //   type: string; // e.g., "AUTO"
  // };
  // archived: boolean;
  // duration: string; // e.g., "PT0S"
  // clientName: string; // "" if there's no client.
  // note: string; // "" if there's no note.
  // costRate: number | null;
  // timeEstimate: { 5 properties }
  // budgetEstimate: ? | null;
  // template: boolean;
  // public: boolean;
}

export interface Tag {
  id: string;
  name: string;
  workspaceId: string;
  archived: boolean;
}

// export interface Workspace {
//   id: string;
//   name: string;
//   hourlyRate: {
//     amount: number;
//     currency: string;
//   };
//   costRate: {
//     amount:number;
//     currency:string;
//   };
//   memberships: [ [Object] ];
//   workspaceSettings: { many, many properties };
// }
