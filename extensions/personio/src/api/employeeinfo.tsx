import axios from "axios";
import { cache } from "./cache";
import { BASE_URL, getPersonioToken } from "./api";

export async function getEmployeeInfoAPI(id: number, token: string) {
  const url = BASE_URL + "/company/employees/" + id;
  const headers = {
    accept: "application/json",
    authorization: "Bearer " + token,
  };

  const res = await axios.get(url, { headers });
  const data = res.data;
  return data.data.attributes.preferred_name.value;
}

export async function getEmployeeInfo(id: number) {
  const token = await getPersonioToken();
  const preferredName = cache.get("preferredName");
  if (preferredName) {
    return preferredName;
  } else {
    const preferredName = await getEmployeeInfoAPI(id, token);
    cache.set("preferredName", preferredName, 10000000);
    return preferredName;
  }
}
