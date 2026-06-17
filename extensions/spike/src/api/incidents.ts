import apiClient from "./apiClient";
import config from "../config";
import * as auth from "../auth";
import axios from "axios";
import { getUser } from "./users";

interface Incident {
  _id: string;
  message: string;
  metadata: object;
  counterId: string;
  status: "NACK" | "ACK" | "RES";
}

/**
 * Fetches a list of incidents from the API.
 *
 * @param {number} [page=1] - The page number to retrieve.
 * @param {number} [perPage=20] - The number of incidents per page.
 * @returns {Promise<Object>} The response data containing the incidents.
 */
export const getIncidents = async (page = 1, perPage = 20) => {
  const response = await apiClient.get("/incidents", {
    params: { page, perPage },
  });
  return response.data;
};

export const getOpenIncidents = async (page = 1, perPage = 20) => {
  const user = await getUser();
  const response = await apiClient.post("/incidents/load-incident-table", {
    query: {
      org: user.org,
      status: { $in: ["NACK", "ACK"] },
    },
    queryParams: {
      page,
      perPage,
    },
  });
  return response.data;
};

export const acknowledgeIncident = async (incident: Incident) => {
  const user = await getUser();
  const data = {
    ids: [incident._id],
    user: user._id,
    orgId: user.org,
  };
  const response = await apiClient.post("/incidents/acknowledge/multi", data);
  return response.data;
};

export const resolveIncident = async (incident: Incident) => {
  const user = await getUser();
  const data = {
    ids: [incident._id],
    user: user._id,
    orgId: user.org,
  };
  const response = await apiClient.post("/incidents/resolve/multi", data);
  return response.data;
};

export const getIncident = async (counterId: string) => {
  const response = await apiClient.get(`/incidents/${counterId}`);
  return response.data;
};

export const setPriority = async (counterIds: string[], priority: string) => {
  const response = await apiClient.post("/incidents/priority/multi", {
    ids: counterIds,
    priority,
  });
  return response.data;
};

export const setSeverity = async (counterIds: string[], severity: string) => {
  const response = await apiClient.post("/incidents/severity/multi", {
    ids: counterIds,
    severity,
  });
  return response.data;
};

export const removePriority = async (counterIds: string[]) => {
  const token = await auth.getToken();
  const options = {
    url: `${config!.api}/incidents/priority/remove/multi`,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    data: {
      ids: counterIds,
    },
  };

  const response = await axios(options);
  return response.data;
};

export const removeSeverity = async (counterIds: string[]) => {
  const token = await auth.getToken();
  const options = {
    url: `${config!.api}/incidents/severity/remove/multi`,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    data: {
      ids: counterIds,
    },
  };

  const response = await axios(options);
  return response.data;
};

export default {
  getIncidents,
  acknowledgeIncident,
  resolveIncident,
  getOpenIncidents,
  getIncident,
  setPriority,
  setSeverity,
  removePriority,
  removeSeverity,
};
