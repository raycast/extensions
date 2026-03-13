import { MoneybirdApiCustomer, MoneybirdApiProject, MoneybirdTimeEntry, MoneybirdUser } from "../types/moneybird";
import { MoneybirdAdministration } from "../types/moneybird";
import { fetchData, fetchPaginated } from "./client";

export const getAdministrationId = async () => {
  const administrations = await fetchData<MoneybirdAdministration[]>("administrations");

  if (administrations.length === 0) {
    throw new Error("No administration found");
  }

  return administrations[0]?.id;
};

export const getContacts = async (administrationId: string) => {
  const customers = await fetchPaginated<MoneybirdApiCustomer>(`${administrationId}/contacts`);

  return customers;
};

export const getProjects = async (administrationId: string) => {
  const projects = await fetchPaginated<MoneybirdApiProject>(`${administrationId}/projects`);
  return projects;
};

export const getUsers = async (administrationId: string) => {
  const users = await fetchPaginated<MoneybirdUser>(`${administrationId}/users`);
  return users;
};

export const createTimeEntry = async (administrationId: string, timeEntry: MoneybirdTimeEntry) => {
  const response = await fetchData(`${administrationId}/time_entries`, {
    method: "POST",
    body: JSON.stringify({ time_entry: timeEntry }),
  });

  return response;
};
