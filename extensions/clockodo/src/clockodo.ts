import { getPreferenceValues } from "@raycast/api";
import { withCache } from "@raycast/utils";
import { Clockodo } from "clockodo";

const preferences = getPreferenceValues<Preferences>();

export const clockodo = new Clockodo({
  client: {
    name: "Raycast Clockodo",
    email: preferences.accountEmail,
  },
  authentication: {
    user: preferences.accountEmail,
    apiKey: preferences.apiToken,
  },
});

/**
 * Clockodo wants the ISO variant without milliseconds.
 *
 * @param date Date
 * @returns string
 */
export const formatDate = (date: Date) => date.toISOString().split(".")[0] + "Z";

const DEFAULT_CACHE_AGE = 12 * 60 * 60 * 1000; // 12 hours

export const getProjects = withCache(
  () =>
    clockodo.getProjects({
      filter: {
        active: true,
      },
    }),
  {
    maxAge: DEFAULT_CACHE_AGE,
  },
);

export const getServices = withCache(
  () =>
    clockodo.getServices({
      filter: {
        active: true,
      },
    }),
  {
    maxAge: DEFAULT_CACHE_AGE,
  },
);

export const getCustomers = withCache(
  () =>
    clockodo.getCustomers({
      filter: {
        active: true,
      },
    }),
  {
    maxAge: DEFAULT_CACHE_AGE,
  },
);

export const getCustomer = (customerId: number) =>
  getCustomers().then((customers) => customers.data.find((customer) => customer.id === customerId));

export const getProject = (projectId: number) =>
  getProjects().then((projects) => projects.data.find((project) => project.id === projectId));

export const getService = (serviceId: number) =>
  getServices().then((services) => services.data.find((service) => service.id === serviceId));

export const getMe = withCache(() => clockodo.getMe(), {
  maxAge: DEFAULT_CACHE_AGE,
});

const cachedEntities = [getProjects, getServices, getCustomers, getMe];

export const clearAllCaches = () => {
  cachedEntities.forEach((entity) => entity.clearCache());
};
