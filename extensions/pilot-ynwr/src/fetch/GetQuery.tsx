export interface Query {
  filter: {
    and: object[];
    or: object[];
  };
  sorts: object[];
  page_size: number;
}

export const getQuery = (andFilters: object[], orFilters: object[], sorts: object[], pageSize: number) => {
  const query: Query = {
    filter: {
      and: andFilters,
      or: orFilters,
    },
    sorts: sorts,
    page_size: pageSize,
  };
  return query;
};

export const GetAllJson = {};

export const GetNoFilteredElement = getQuery([], [], [], 100);

export const GetProjectQuery = (active: boolean) => {
  const andFilter: object[] = [];
  if (active) andFilter.push(filterActiveProject);

  const query: Query = getQuery(andFilter, [], [], 100);
  return query;
};

export const GetJournalsQuery = (activeProject: boolean, projectFilter: string, onlyLast: boolean, date: string) => {
  const andFilter: object[] = [];
  const sortFilter: object[] = [];
  let pageSize: number = 100;

  if (activeProject) andFilter.push(filterActiveElement);
  if (projectFilter !== "Nothing") andFilter.push(filterByProject(projectFilter));
  if (onlyLast) {
    pageSize = 1;
    sortFilter.push({ property: "Date", direction: "descending" });
  }
  if (date !== "") andFilter.push(filterOnlyTodayKeystone(date));

  const query: Query = getQuery(andFilter, [], sortFilter, pageSize);
  return query;
};

export const GetTodosQuery = (onlyUndone: boolean, projectFilter: string) => {
  const andFilter: object[] = [];

  andFilter.push(filterActiveElement);
  if (onlyUndone) andFilter.push(filterByUnDoneTodos);
  if (projectFilter !== "Nothing") andFilter.push(filterByProject(projectFilter));

  const query: Query = getQuery(andFilter, [], [], 100);
  return query;
};

export const GetEventsQuery = (
  activeProject: boolean,
  projectFilter: string,
  onlyAfterNow: boolean,
  onlyToday: boolean,
  today: string,
) => {
  const andFilter: object[] = [];

  const todayDate = new Date(today);
  todayDate.setHours(0);
  todayDate.setMinutes(0);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString();

  if (activeProject) andFilter.push(filterActiveElement);
  if (projectFilter !== "Nothing") andFilter.push(filterByProject(projectFilter));
  if (onlyAfterNow && today.length !== 0) andFilter.push(filterNextFromNow(today));
  if (onlyToday) andFilter.push(filterOnlyTodayEvent(today, tomorrow));

  const query: Query = getQuery(andFilter, [], [], 100);
  return query;
};

export const GetKeystoneQuery = (activeProject: boolean, projectFilter: string, onlyToday: boolean, today: string) => {
  const andFilter: object[] = [];

  if (activeProject) andFilter.push(filterActiveElement);
  if (projectFilter !== "Nothing") andFilter.push(filterByProject(projectFilter));
  if (onlyToday) andFilter.push(filterOnlyTodayKeystone(today));
  if (today.length !== 0) andFilter.push(filterNextFromNow(today));

  const query: Query = getQuery(andFilter, [], [], 100);
  return query;
};

export const GetSubPagesQuery = (onlyActiveParent: boolean) => {
  const andFilter: object[] = [];
  if (onlyActiveParent) andFilter.push(filterActiveParentProject);
  const query: Query = getQuery(andFilter, [], [], 100);
  return query;
};

export const GetLinksQuery = (onlyActiveProject: boolean) => {
  const andFilter: object[] = [];
  if (onlyActiveProject) andFilter.push(filterActiveElement);
  const query: Query = getQuery(andFilter, [], [], 100);
  return query;
};

export const GetTimersQuery = (onlyActiveProject: boolean, isRunning: boolean) => {
  const andFilter: object[] = [];
  if (onlyActiveProject) andFilter.push(filterActiveElement);
  if (isRunning) andFilter.push(filterRunningTimer);
  const query: Query = getQuery(andFilter, [], [], 100);
  return query;
};

//-----------------------------------

const filterActiveParentProject = {
  property: "Parent_Active",
  rollup: {
    any: {
      checkbox: {
        equals: true,
      },
    },
  },
};

export const filterActiveProject = {
  property: "Active",
  checkbox: {
    equals: true,
  },
};

export const filterActiveElement = {
  property: "Projects_Active",
  rollup: {
    any: {
      checkbox: {
        equals: true,
      },
    },
  },
};

export const filterByProject = (name: string) => {
  return {
    property: "Projects_Name",
    rollup: {
      any: {
        rich_text: {
          contains: name,
        },
      },
    },
  };
};

export const filterByUnDoneTodos = {
  property: "Checkbox",
  checkbox: {
    equals: false,
  },
};

export const filterNextInTime = {
  filter: {
    and: [
      {
        property: "Date",
        on_or_after: Date.now().toString(),
      },
    ],
  },
  sort: [
    {
      property: "Date",
      direction: "descending",
    },
  ],
};

export const filterNextInTimeEvent = (date: string) => {
  return {
    filter: {
      and: [
        {
          property: "Date",
          on_or_after: date,
        },
      ],
    },
    sort: [
      {
        property: "Date",
        direction: "descending",
      },
    ],
  };
};

const filterNextFromNow = (date: string) => {
  return {
    property: "Date",
    date: {
      on_or_after: date,
    },
  };
};

const filterOnlyTodayKeystone = (date: string) => {
  return {
    property: "Date",
    date: {
      equals: date,
    },
  };
};

const filterOnlyTodayEvent = (date: string, tomorrow: string) => {
  return {
    property: "Date",
    date: {
      after: date,
      before: tomorrow,
    },
  };
};

const filterRunningTimer = {
  property: "Running",
  checkbox: {
    equals: true,
  },
};

export const GetActiveElement = getQuery([filterActiveElement], [], [], 100);
